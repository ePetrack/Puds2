import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import { createComplex } from '$lib/server/services/complexes';
import { createMeter } from '$lib/server/services/meters';
import { createReading } from '$lib/server/services/energy-readings';
import { createProvider } from '$lib/server/services/providers';
import { createAccount } from '$lib/server/services/utility-accounts';
import { createBill } from '$lib/server/services/utility-bills';
import { getAnalysisDataset } from '$lib/server/services/analysis';
import { ensureTestActor, TEST_ACTOR } from './setup';

/** A recent date so the default 24-month window always includes it. */
const today = new Date();
const recent = (monthsAgo: number) => {
	const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 15);
	return d.toISOString().slice(0, 10);
};

let buildingId: string;
let complexId: string;
let accountId: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyInput = (o: Record<string, unknown>) => o as any;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, bill_allocations, utility_bills, energy_readings, meters, utility_accounts, rate_schedules, utility_providers, buildings, complexes, campuses, clients CASCADE`
	);

	const client = await createClient(TEST_ACTOR, { name: 'Analysis U', status: 'active' });
	const complex = await createComplex(TEST_ACTOR, { clientId: client.id, name: 'Central Plant' });
	const building = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		complexId: complex.id,
		name: 'Science Hall',
		squareFootage: 50_000
	});
	buildingId = building.id;
	complexId = complex.id;

	const provider = await createProvider(
		TEST_ACTOR,
		anyInput({ name: 'Grid Power', utilityTypes: ['electricity'] })
	);
	const account = await createAccount(
		TEST_ACTOR,
		anyInput({
			clientId: client.id,
			providerId: provider.id,
			accountNumber: 'ACCT-AN',
			utilityType: 'electricity',
			status: 'active'
		})
	);
	accountId = account.id;
});

const meterOn = (overrides: Record<string, unknown>) =>
	createMeter(
		TEST_ACTOR,
		anyInput({ utilityType: 'electricity', unit: 'kwh', status: 'active', ...overrides })
	);

describe('getAnalysisDataset', () => {
	it('returns bills and readings in one dataset, tagged by record type', async () => {
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-1', accountId });
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: recent(1), usage: 1000, readingType: 'actual' })
		);
		await createBill(
			TEST_ACTOR,
			anyInput({
				accountId,
				meterId: meter.id,
				statementDate: recent(1),
				periodStart: recent(2),
				periodEnd: recent(1),
				usage: 5000,
				unit: 'kWh',
				totalCost: 800,
				status: 'pending'
			})
		);

		const rows = await getAnalysisDataset();
		expect(rows.filter((r) => r.record_type === 'bill')).toHaveLength(1);
		expect(rows.filter((r) => r.record_type === 'reading')).toHaveLength(1);
	});

	it('derives month and year from the row date', async () => {
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-2' });
		const date = recent(1);
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: date, usage: 10, readingType: 'actual' })
		);

		const [row] = await getAnalysisDataset();
		expect(row.month).toBe(date.slice(0, 7));
		expect(row.year).toBe(Number(date.slice(0, 4)));
	});

	it('converts numerics to numbers and leaves absent values null', async () => {
		// Postgres returns numeric columns as strings; Perspective needs real numbers, and a
		// missing demand reading must stay null rather than becoming 0.
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-3' });
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: recent(1), usage: 1234.5, readingType: 'actual' })
		);

		const [row] = await getAnalysisDataset();
		expect(row.usage).toBe(1234.5);
		expect(row.demand_kw).toBeNull();
		expect(row.cost).toBeNull();
	});

	it('excludes rows older than the requested window', async () => {
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-4' });
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: recent(1), usage: 1, readingType: 'actual' })
		);
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: recent(10), usage: 2, readingType: 'actual' })
		);

		expect(await getAnalysisDataset(24)).toHaveLength(2);
		expect(await getAnalysisDataset(3)).toHaveLength(1);
	});

	it('carries the account and provider onto a bill row', async () => {
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-5', accountId });
		await createBill(
			TEST_ACTOR,
			anyInput({
				accountId,
				meterId: meter.id,
				statementDate: recent(1),
				periodStart: recent(2),
				periodEnd: recent(1),
				usage: 100,
				totalCost: 50,
				status: 'pending'
			})
		);

		const [bill] = await getAnalysisDataset();
		expect(bill).toMatchObject({
			record_type: 'bill',
			client: 'Analysis U',
			building: 'Science Hall',
			provider: 'Grid Power',
			account_number: 'ACCT-AN'
		});
	});

	it('leaves provider and account null on a reading row', async () => {
		// Readings come off a meter, not an invoice — inventing an account for them would put
		// a billing fact on a measurement.
		const meter = await meterOn({ buildingId, meterNumber: 'MTR-6', accountId });
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: meter.id, readingDate: recent(1), usage: 10, readingType: 'actual' })
		);

		const [row] = await getAnalysisDataset();
		expect(row.provider).toBeNull();
		expect(row.account_number).toBeNull();
	});

	it('KNOWN GAP: a complex master meter reading has no building and no client', async () => {
		// Pins the current, wrong behaviour described in `ANALYTICS-1`: the reading query reaches
		// the client via `buildings.client_id`, so a meter whose premise is a *complex* — which
		// has no building — lands in the dataset silently unattributed.
		//
		// This test asserts the defect on purpose so the fix is a deliberate change here rather
		// than a surprise. When `ANALYTICS-1` adds the complex→client fallback, update it to
		// expect 'Analysis U'.
		const master = await meterOn({ complexId, meterNumber: 'MTR-MASTER' });
		await createReading(
			TEST_ACTOR,
			anyInput({ meterId: master.id, readingDate: recent(1), usage: 9000, readingType: 'actual' })
		);

		const [row] = await getAnalysisDataset();
		expect(row.meter_number).toBe('MTR-MASTER');
		expect(row.building).toBeNull();
		expect(row.client).toBeNull();
	});

	it('returns an empty dataset rather than throwing when there is nothing to report', async () => {
		expect(await getAnalysisDataset()).toEqual([]);
	});
});

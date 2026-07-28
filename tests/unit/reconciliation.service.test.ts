import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { createClient } from '$lib/server/services/clients';
import { createComplex } from '$lib/server/services/complexes';
import { createBuilding } from '$lib/server/services/buildings';
import { createMeter } from '$lib/server/services/meters';
import { createReading } from '$lib/server/services/energy-readings';
import { listReconcilableMeters, reconcileMeter } from '$lib/server/services/reconciliation';
import { ensureTestActor, TEST_ACTOR } from './setup';

/** This month, so readings land inside the trailing window. */
const TODAY = new Date();
const day = (n: number) =>
	new Date(TODAY.getFullYear(), TODAY.getMonth(), n).toISOString().slice(0, 10);
const PERIOD = TODAY.toISOString().slice(0, 7);

async function resetTables() {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, bill_allocations, utility_bills, energy_readings, meters, utility_accounts, rate_schedules, utility_providers, buildings, complexes, campuses, clients CASCADE`
	);
}

let masterId: string;
let sciId: string;
let stuId: string;
let lonelyId: string;

const meterInput = (overrides: Record<string, unknown>) =>
	({
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active',
		...overrides
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) as any;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetTables();

	const client = await createClient(TEST_ACTOR, { name: 'Recon U', status: 'active' as const });
	const complex = await createComplex(TEST_ACTOR, { clientId: client.id, name: 'Plant District' });
	const sci = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		complexId: complex.id,
		name: 'Science Hall'
	});
	const stu = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		complexId: complex.id,
		name: 'Student Center'
	});

	const master = await createMeter(
		TEST_ACTOR,
		meterInput({ complexId: complex.id, meterNumber: 'MTR-MASTER' })
	);
	const sciSub = await createMeter(
		TEST_ACTOR,
		meterInput({ buildingId: sci.id, parentMeterId: master.id, meterNumber: 'MTR-SUB-SCI' })
	);
	const stuSub = await createMeter(
		TEST_ACTOR,
		meterInput({ buildingId: stu.id, parentMeterId: master.id, meterNumber: 'MTR-SUB-STU' })
	);
	// A meter with no children — must never be offered for reconciliation.
	const lonely = await createMeter(
		TEST_ACTOR,
		meterInput({ buildingId: sci.id, meterNumber: 'MTR-LONELY' })
	);

	masterId = master.id;
	sciId = sciSub.id;
	stuId = stuSub.id;
	lonelyId = lonely.id;

	// 100k master against 45k + 30k submetered → a 25% unaccounted common-area load.
	await createReading(TEST_ACTOR, {
		meterId: master.id,
		readingDate: day(28),
		usage: 100_000,
		readingType: 'actual' as const
	});
	await createReading(TEST_ACTOR, {
		meterId: sciSub.id,
		readingDate: day(28),
		usage: 45_000,
		readingType: 'actual' as const
	});
	await createReading(TEST_ACTOR, {
		meterId: stuSub.id,
		readingDate: day(28),
		usage: 30_000,
		readingType: 'actual' as const
	});
});

describe('listReconcilableMeters', () => {
	it('offers only meters that actually have submeters', async () => {
		const list = await listReconcilableMeters();

		expect(list.map((m) => m.meterNumber)).toEqual(['MTR-MASTER']);
		expect(list[0].submeterCount).toBe(2);
		expect(list[0].premiseName).toBe('Plant District');
	});

	it('excludes a meter with no children', async () => {
		const list = await listReconcilableMeters();
		expect(list.some((m) => m.id === lonelyId)).toBe(false);
	});
});

describe('reconcileMeter', () => {
	it('reconciles the master against the sum of its submeters', async () => {
		const r = (await reconcileMeter(masterId))!;
		const period = r.periods.find((p) => p.period === PERIOD)!;

		expect(period.masterUsage).toBe(100_000);
		expect(period.submeterTotal).toBe(75_000);
		expect(period.submeterCount).toBe(2);
		expect(period.delta).toBe(25_000);
		expect(period.deltaPct).toBe(25);
		expect(period.status).toBe('unaccounted');
	});

	it('lists the submeters it compared against', async () => {
		const r = (await reconcileMeter(masterId))!;
		expect(r.submeters.map((s) => s.meterNumber).sort()).toEqual(['MTR-SUB-SCI', 'MTR-SUB-STU']);
		expect(r.submeters.find((s) => s.meterNumber === 'MTR-SUB-SCI')!.premiseName).toBe(
			'Science Hall'
		);
	});

	it('surfaces submeters exceeding the master as over-metered', async () => {
		// Double the Science Hall read so the children exceed the parent.
		await createReading(TEST_ACTOR, {
			meterId: sciId,
			readingDate: day(27),
			usage: 60_000,
			readingType: 'actual' as const
		});

		const r = (await reconcileMeter(masterId))!;
		const period = r.periods.find((p) => p.period === PERIOD)!;

		expect(period.submeterTotal).toBe(135_000);
		expect(period.status).toBe('over_metered');
		expect(r.summary.overMeteredPeriods).toBe(1);
	});

	it('counts a submeter once even when it reports several times in a period', async () => {
		await createReading(TEST_ACTOR, {
			meterId: stuId,
			readingDate: day(14),
			usage: 5000,
			readingType: 'actual' as const
		});

		const r = (await reconcileMeter(masterId))!;
		const period = r.periods.find((p) => p.period === PERIOD)!;

		expect(period.submeterCount).toBe(2);
		expect(period.submeterTotal).toBe(80_000);
	});

	it('returns undefined for a meter with nothing beneath it', async () => {
		expect(await reconcileMeter(lonelyId)).toBeUndefined();
	});

	it('sums the span rather than averaging periods', async () => {
		const r = (await reconcileMeter(masterId))!;

		expect(r.summary.masterTotal).toBe(100_000);
		expect(r.summary.submeterTotal).toBe(75_000);
		expect(r.summary.delta).toBe(25_000);
		expect(r.summary.deltaPct).toBe(25);
	});
});

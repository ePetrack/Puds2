import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import { createProvider } from '$lib/server/services/providers';
import { createAccount } from '$lib/server/services/utility-accounts';
import { createMeter } from '$lib/server/services/meters';
import {
	createReading,
	listReadings,
	importReadingsCSV,
	monthlyUsageSeries
} from '$lib/server/services/energy-readings';
import { ensureTestActor, TEST_ACTOR } from './setup';

let meterId: string;
let buildingId: string;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, energy_readings, meters, utility_accounts, utility_providers, buildings, clients CASCADE`
	);
	const client = await createClient(TEST_ACTOR, { name: 'Energy U', status: 'active' as const });
	const building = await createBuilding(TEST_ACTOR, { clientId: client.id, name: 'Meter Hall' });
	buildingId = building.id;
	const provider = await createProvider(TEST_ACTOR, { name: 'Power Co', utilityTypes: [] });
	const account = await createAccount(TEST_ACTOR, {
		clientId: client.id,
		providerId: provider.id,
		accountNumber: 'E-001',
		utilityType: 'electricity',
		status: 'active'
	});
	const meter = await createMeter(TEST_ACTOR, {
		buildingId,
		accountId: account.id,
		meterNumber: 'MTR-100',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active'
	});
	meterId = meter.id;
});

describe('energy readings service', () => {
	it('creates and lists readings with meter/building refs', async () => {
		await createReading(TEST_ACTOR, {
			meterId,
			readingDate: '2026-06-30',
			usage: 42500,
			readingType: 'actual'
		});

		const list = await listReadings({ buildingId });
		expect(list.total).toBe(1);
		expect(list.items[0].meterNumber).toBe('MTR-100');
		expect(list.items[0].buildingName).toBe('Meter Hall');
	});

	it('rejects a duplicate meter + date', async () => {
		await createReading(TEST_ACTOR, {
			meterId,
			readingDate: '2026-06-30',
			usage: 100,
			readingType: 'actual'
		});
		await expect(
			createReading(TEST_ACTOR, {
				meterId,
				readingDate: '2026-06-30',
				usage: 200,
				readingType: 'actual'
			})
		).rejects.toThrow();
	});

	it('imports CSV rows, skipping unknown meters, bad rows, and duplicates', async () => {
		await createReading(TEST_ACTOR, {
			meterId,
			readingDate: '2026-05-31',
			usage: 40000,
			readingType: 'actual'
		});

		const csv = [
			'meter_number,reading_date,usage,demand_kw',
			'MTR-100,2026-06-30,42500,180', // valid
			'MTR-999,2026-06-30,100,', // unknown meter
			'MTR-100,not-a-date,100,', // invalid date
			'MTR-100,2026-07-31,51200,210', // valid
			'MTR-100,2026-07-31,999,', // duplicate within file
			'MTR-100,2026-05-31,123,' // already exists in DB
		].join('\n');

		const result = await importReadingsCSV(TEST_ACTOR, csv);
		expect(result.imported).toBe(2);
		const lines = result.failures.map((f) => f.line).sort((a, b) => a - b);
		expect(lines).toEqual([0, 3, 4, 6]); // 0 = existing-in-DB summary row

		const list = await listReadings({ meterId });
		expect(list.total).toBe(3); // 1 pre-existing + 2 imported
	});

	it('aggregates a monthly usage series with stable 12 buckets', async () => {
		const now = new Date();
		const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
		await createReading(TEST_ACTOR, {
			meterId,
			readingDate: lastMonthEnd.toISOString().split('T')[0],
			usage: 1000,
			readingType: 'actual'
		});

		const series = await monthlyUsageSeries({ meterId });
		expect(series).toHaveLength(12);
		const key = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`;
		const bucket = series.find((p) => p.month === key);
		expect(bucket?.usage).toBe(1000);
		expect(series.reduce((s, p) => s + p.usage, 0)).toBe(1000);
	});
});

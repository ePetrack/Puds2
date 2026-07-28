import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { degreeDays } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import { createMeter } from '$lib/server/services/meters';
import { createReading } from '$lib/server/services/energy-readings';
import { normalizeBuildings } from '$lib/server/services/weather-normalization';
import { ensureTestActor, TEST_ACTOR } from './setup';

/**
 * A fixed, past window so the test is stable regardless of when it runs: 24 baseline
 * months of readings and weather, then a bill period immediately after them.
 */
const BASELINE_MONTHS = 24;
const PERIOD_START = '2026-01-01';
const PERIOD_END = '2026-01-31';

function monthsBefore(n: number): string[] {
	const out: string[] = [];
	for (let i = n; i >= 1; i--) {
		const d = new Date(Date.UTC(2026, 0, 1));
		d.setUTCMonth(d.getUTCMonth() - i);
		out.push(d.toISOString().slice(0, 10));
	}
	return out;
}

/** Seasonal degree days at a 65°F base — heating in winter, cooling in summer. */
function weatherFor(period: string) {
	const m = new Date(period + 'T00:00:00Z').getUTCMonth();
	return {
		hdd: Math.round(900 * Math.max(0, Math.cos((m / 12) * 2 * Math.PI)) + 20),
		cdd: Math.round(600 * Math.max(0, Math.cos(((m - 6) / 12) * 2 * Math.PI)) + 10)
	};
}

async function resetTables() {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, degree_days, energy_readings, meters, buildings, complexes, campuses, clients CASCADE`
	);
}

const meterInput = (overrides: Record<string, unknown>) =>
	({
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active',
		...overrides
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) as any;

let sensitiveId: string;
let flatId: string;
let sparseId: string;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetTables();

	const periods = monthsBefore(BASELINE_MONTHS);
	await db.insert(degreeDays).values(
		periods.concat([PERIOD_START]).map((period) => {
			const w = weatherFor(period);
			return {
				station: 'TEST',
				period,
				baseTempF: '65',
				hdd: String(w.hdd),
				cdd: String(w.cdd),
				source: 'test'
			};
		})
	);

	const client = await createClient(TEST_ACTOR, { name: 'Weather U', status: 'active' as const });

	// Steep heating slope — an old, leaky building.
	const sensitive = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		name: 'Old Lab',
		squareFootage: 50_000
	});
	// Nearly weather-independent — modern and airtight, same floor area.
	const flat = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		name: 'New Office',
		squareFootage: 50_000
	});
	// Only a few months of history.
	const sparse = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		name: 'New Wing',
		squareFootage: 50_000
	});
	sensitiveId = sensitive.id;
	flatId = flat.id;
	sparseId = sparse.id;

	const plan: [string, number, number, number][] = [
		[sensitive.id, 20_000, 40, 10],
		[flat.id, 20_000, 2, 2],
		[sparse.id, 20_000, 40, 10]
	];

	for (const [buildingId, base, bh, bc] of plan) {
		const meter = await createMeter(
			TEST_ACTOR,
			meterInput({ buildingId, meterNumber: `MTR-${buildingId.slice(0, 6)}` })
		);
		const months = buildingId === sparse.id ? periods.slice(-4) : periods;
		for (const period of months) {
			const w = weatherFor(period);
			await createReading(TEST_ACTOR, {
				meterId: meter.id,
				readingDate: period,
				usage: base + bh * w.hdd + bc * w.cdd,
				readingType: 'actual' as const
			});
		}
	}
});

describe('normalizeBuildings', () => {
	it('recovers each building’s own weather sensitivity', async () => {
		const result = await normalizeBuildings(
			[sensitiveId, flatId],
			PERIOD_START,
			PERIOD_END,
			BASELINE_MONTHS
		);

		const sensitive = result.buildings.find((b) => b.buildingId === sensitiveId)!;
		const flat = result.buildings.find((b) => b.buildingId === flatId)!;

		expect(sensitive.fit!.hddCoefficient).toBeCloseTo(40, 3);
		expect(flat.fit!.hddCoefficient).toBeCloseTo(2, 3);
		expect(sensitive.fit!.rSquared).toBeCloseTo(1, 3);
	});

	it('expects far more from the heating-sensitive building in a cold month', async () => {
		const result = await normalizeBuildings(
			[sensitiveId, flatId],
			PERIOD_START,
			PERIOD_END,
			BASELINE_MONTHS
		);

		const sensitive = result.buildings.find((b) => b.buildingId === sensitiveId)!.expectedUsage!;
		const flat = result.buildings.find((b) => b.buildingId === flatId)!.expectedUsage!;

		// Same floor area, so an area split would charge these two identically — which is
		// precisely the distortion this method exists to remove.
		expect(sensitive).toBeGreaterThan(flat * 1.5);
	});

	it('records the weather series it used', async () => {
		const result = await normalizeBuildings(
			[sensitiveId],
			PERIOD_START,
			PERIOD_END,
			BASELINE_MONTHS
		);

		expect(result.station).toBe('TEST');
		expect(result.baseTempF).toBe(65);
		expect(result.periodHdd).toBeGreaterThan(0);
	});

	it('refuses a building with too little history, and says why', async () => {
		const result = await normalizeBuildings([sparseId], PERIOD_START, PERIOD_END, BASELINE_MONTHS);
		const sparse = result.buildings[0];

		expect(sparse.expectedUsage).toBeNull();
		expect(sparse.reason).toMatch(/12 are needed/);
		expect(result.warnings.join(' ')).toMatch(/could not be weather-normalised/);
	});

	it('returns nothing usable when no degree days cover the period', async () => {
		await db.execute(sql`TRUNCATE TABLE degree_days`);
		const result = await normalizeBuildings(
			[sensitiveId],
			PERIOD_START,
			PERIOD_END,
			BASELINE_MONTHS
		);

		expect(result.station).toBeNull();
		expect(result.buildings[0].expectedUsage).toBeNull();
		expect(result.warnings.join(' ')).toMatch(/No degree-day data/);
	});

	it('handles being asked about no buildings at all', async () => {
		const result = await normalizeBuildings([], PERIOD_START, PERIOD_END);
		expect(result.buildings).toEqual([]);
	});
});

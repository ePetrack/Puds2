import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog, degreeDays } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import { createComplex } from '$lib/server/services/complexes';
import { createMeter } from '$lib/server/services/meters';
import { createProvider } from '$lib/server/services/providers';
import { createAccount } from '$lib/server/services/utility-accounts';
import { createBill } from '$lib/server/services/utility-bills';
import { createReading } from '$lib/server/services/energy-readings';
import {
	allocationContext,
	previewAllocation,
	saveAllocation,
	getAllocation,
	deleteAllocation,
	AllocationError
} from '$lib/server/services/bill-allocation';
import { ensureTestActor, TEST_ACTOR } from './setup';

let masterBillId: string;
let buildingBillId: string;
let sciId: string;
let stuId: string;
let sciSubId: string;
let stuSubId: string;

async function resetTables() {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, bill_allocations, utility_bills, energy_readings, degree_days, meters, utility_accounts, rate_schedules, utility_providers, buildings, complexes, campuses, clients CASCADE`
	);
}

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetTables();

	const client = await createClient(TEST_ACTOR, { name: 'Alloc U', status: 'active' as const });
	const complex = await createComplex(TEST_ACTOR, { clientId: client.id, name: 'Plant District' });

	// 100k sf vs 50k sf, so an area split is an unambiguous 2:1.
	const sci = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		complexId: complex.id,
		name: 'Science Hall',
		squareFootage: 100_000,
		occupancy: 300
	});
	const stu = await createBuilding(TEST_ACTOR, {
		clientId: client.id,
		complexId: complex.id,
		name: 'Student Center',
		squareFootage: 50_000,
		occupancy: 100
	});
	sciId = sci.id;
	stuId = stu.id;

	const provider = await createProvider(TEST_ACTOR, { name: 'Alloc Power', utilityTypes: [] });
	const account = await createAccount(TEST_ACTOR, {
		clientId: client.id,
		providerId: provider.id,
		accountNumber: 'ACCT-ALLOC',
		utilityType: 'electricity',
		status: 'active'
	});

	const master = await createMeter(TEST_ACTOR, {
		complexId: complex.id,
		accountId: account.id,
		meterNumber: 'MTR-MASTER',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active'
	});
	const sciSub = await createMeter(TEST_ACTOR, {
		buildingId: sci.id,
		parentMeterId: master.id,
		meterNumber: 'MTR-SUB-SCI',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active'
	});
	const stuSub = await createMeter(TEST_ACTOR, {
		buildingId: stu.id,
		parentMeterId: master.id,
		meterNumber: 'MTR-SUB-STU',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active'
	});
	sciSubId = sciSub.id;
	stuSubId = stuSub.id;

	// 45k + 30k of a 100k master → a 25k common-area remainder.
	await createReading(TEST_ACTOR, {
		meterId: sciSub.id,
		readingDate: '2026-06-30',
		usage: 45_000,
		readingType: 'actual' as const
	});
	await createReading(TEST_ACTOR, {
		meterId: stuSub.id,
		readingDate: '2026-06-30',
		usage: 30_000,
		readingType: 'actual' as const
	});

	const masterBill = await createBill(TEST_ACTOR, {
		accountId: account.id,
		meterId: master.id,
		statementDate: '2026-07-05',
		periodStart: '2026-06-01',
		periodEnd: '2026-06-30',
		usage: 100_000,
		unit: 'kWh',
		demandKw: 400,
		energyCharge: 10_000,
		demandCharge: 5000,
		fixedCharge: 1000,
		totalCost: 16_000,
		status: 'pending' as const
	});
	masterBillId = masterBill.id;

	// A bill on a plain building meter has nothing to split.
	const buildingMeter = await createMeter(TEST_ACTOR, {
		buildingId: sci.id,
		accountId: account.id,
		meterNumber: 'MTR-BLDG',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active'
	});
	const buildingBill = await createBill(TEST_ACTOR, {
		accountId: account.id,
		meterId: buildingMeter.id,
		statementDate: '2026-07-05',
		periodStart: '2026-06-01',
		periodEnd: '2026-06-30',
		usage: 5000,
		totalCost: 800,
		status: 'pending' as const
	});
	buildingBillId = buildingBill.id;
});

describe('allocationContext', () => {
	it('resolves the complex master meter to the buildings it serves', async () => {
		const ctx = await allocationContext(masterBillId);
		expect(ctx.available).toBe(true);
		expect(ctx.targets.map((t) => t.label).sort()).toEqual(['Science Hall', 'Student Center']);
	});

	it('reports a building-meter bill as not allocatable instead of throwing', async () => {
		const ctx = await allocationContext(buildingBillId);
		expect(ctx.available).toBe(false);
		expect(ctx.reason).toMatch(/complex master meter/i);
	});
});

describe('previewAllocation', () => {
	it('pulls submeter usage from readings inside the bill period', async () => {
		const result = await previewAllocation(masterBillId, 'submetered');
		const sci = result.lines.find((l) => l.buildingId === sciId)!;
		const stu = result.lines.find((l) => l.buildingId === stuId)!;

		expect(sci.basisValue).toBe(45_000);
		expect(stu.basisValue).toBe(30_000);
		expect(sci.sharePct).toBeCloseTo(45, 6);
		expect(stu.sharePct).toBeCloseTo(30, 6);
	});

	it('shows the unmetered shortfall as its own remainder line', async () => {
		const result = await previewAllocation(masterBillId, 'submetered');
		const remainder = result.lines.find((l) => l.isRemainder)!;

		expect(remainder.buildingId).toBeNull();
		expect(remainder.sharePct).toBeCloseTo(25, 6);
		expect(remainder.usage).toBeCloseTo(25_000, 3);
		expect(result.lines.reduce((a, l) => a + l.totalCost, 0)).toBeCloseTo(16_000, 10);
	});

	it('splits by area on the buildings’ square footage', async () => {
		const result = await previewAllocation(masterBillId, 'area');
		const sci = result.lines.find((l) => l.buildingId === sciId)!;

		expect(sci.sharePct).toBeCloseTo(66.666667, 4);
		expect(result.lines.some((l) => l.isRemainder)).toBe(false);
		expect(result.lines.reduce((a, l) => a + l.totalCost, 0)).toBeCloseTo(16_000, 10);
	});

	it('warns when no readings fall inside the bill period', async () => {
		await db.execute(sql`TRUNCATE TABLE energy_readings CASCADE`);
		await expect(previewAllocation(masterBillId, 'submetered')).rejects.toBeInstanceOf(
			AllocationError
		);

		const ctx = await allocationContext(masterBillId);
		expect(ctx.warnings.some((w) => w.includes('bill period'))).toBe(true);
	});

	it('rejects fixed percentages that do not sum to 100', async () => {
		await expect(
			previewAllocation(masterBillId, 'fixed_percentage', { [sciId]: 60, [stuId]: 20 })
		).rejects.toBeInstanceOf(AllocationError);
	});
});

describe('previewAllocation — weather_normalized', () => {
	/**
	 * Twenty-five months ending with the bill period itself, so both buildings clear the
	 * 12-month minimum and the June bill has weather to be predicted from.
	 */
	const baselineMonths = (() => {
		const out: string[] = [];
		for (let i = 24; i >= 0; i--) {
			const d = new Date(Date.UTC(2026, 5, 1));
			d.setUTCMonth(d.getUTCMonth() - i);
			out.push(d.toISOString().slice(0, 10));
		}
		return out;
	})();

	/** A temperate profile: heating-dominated in winter, cooling-dominated in summer. */
	function weatherFor(period: string) {
		const m = new Date(period + 'T00:00:00Z').getUTCMonth();
		return {
			hdd: Math.round(900 * Math.max(0, Math.cos((m / 12) * 2 * Math.PI)) + 20),
			cdd: Math.round(600 * Math.max(0, Math.cos(((m - 6) / 12) * 2 * Math.PI)) + 10)
		};
	}

	async function seedWeatherAndBaseline() {
		await db.insert(degreeDays).values(
			baselineMonths.map((period) => {
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

		// Same weather-independent load, but Student Center is the cooling hog. In a June bill
		// that should pull its share *above* Science Hall's despite half the floor area — which
		// is exactly the distortion an area split hides.
		const plan: [string, number, number][] = [
			[sciSubId, 5, 5],
			[stuSubId, 5, 45]
		];
		for (const [meterId, bh, bc] of plan) {
			// Only the months strictly before the bill period form the baseline.
			for (const period of baselineMonths.slice(0, -1)) {
				const w = weatherFor(period);
				await createReading(TEST_ACTOR, {
					meterId,
					readingDate: period,
					usage: 20_000 + bh * w.hdd + bc * w.cdd,
					readingType: 'actual' as const
				});
			}
		}
	}

	it('splits on predicted usage, not floor area, when every building fits', async () => {
		await seedWeatherAndBaseline();
		const result = await previewAllocation(masterBillId, 'weather_normalized');

		expect(result.basis).toMatchObject({
			requestedMethod: 'weather_normalized',
			appliedMethod: 'weather_normalized'
		});

		const sci = result.lines.find((l) => l.buildingId === sciId)!;
		const stu = result.lines.find((l) => l.buildingId === stuId)!;

		// The area split would be 66.67 / 33.33. Weather normalisation inverts it.
		expect(stu.sharePct).toBeGreaterThan(sci.sharePct);
		expect(result.lines.reduce((a, l) => a + l.totalCost, 0)).toBeCloseTo(16_000, 10);
	});

	it('records the weather series and the fit so the number can be re-derived later', async () => {
		await seedWeatherAndBaseline();
		const result = await previewAllocation(masterBillId, 'weather_normalized');

		const weather = (result.basis as { weather: Record<string, unknown> }).weather;
		expect(weather).toMatchObject({ station: 'TEST', baseTempF: 65 });
		expect(weather.periodCdd).toBeGreaterThan(0);

		const buildings = weather.buildings as { buildingId: string; fit?: { months: number } }[];
		expect(buildings.find((b) => b.buildingId === stuId)!.fit!.months).toBe(24);
	});

	it('falls back to an area split, and says so, when there is no weather at all', async () => {
		const result = await previewAllocation(masterBillId, 'weather_normalized');

		expect(result.basis).toMatchObject({
			requestedMethod: 'weather_normalized',
			appliedMethod: 'area'
		});
		// Falling back silently would be the failure mode: the operator has to be able to see
		// that the saved split is not the one they asked for.
		expect(result.warnings.join(' ')).toMatch(/split by square footage instead/);

		const sci = result.lines.find((l) => l.buildingId === sciId)!;
		expect(sci.sharePct).toBeCloseTo(66.666667, 4);
	});

	it('reports the stored weather coverage alongside the allocation context', async () => {
		await seedWeatherAndBaseline();
		const ctx = await allocationContext(masterBillId);

		expect(ctx.weatherCoverage).toHaveLength(1);
		expect(ctx.weatherCoverage[0]).toMatchObject({ station: 'TEST', baseTempF: 65, months: 25 });
	});
});

describe('saveAllocation', () => {
	it('persists lines and writes an audit entry', async () => {
		const saved = await saveAllocation(TEST_ACTOR, masterBillId, 'area', 'BOMA gross area');

		expect(saved.method).toBe('area');
		expect(saved.notes).toBe('BOMA gross area');
		expect(saved.lines).toHaveLength(2);
		expect(saved.lines.reduce((a, l) => a + Number(l.totalCost), 0)).toBeCloseTo(16_000, 2);

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'bill_allocation'), eq(auditLog.entityId, saved.id)));
		expect(audits).toHaveLength(1);
		expect(audits[0].action).toBe('create');
	});

	it('snapshots the basis so a later square-footage change cannot rewrite history', async () => {
		const saved = await saveAllocation(TEST_ACTOR, masterBillId, 'area');
		expect(saved.basis).toMatchObject({ basisLabel: 'Square footage', basisTotal: 150_000 });
	});

	it('replaces the previous allocation rather than stacking a second one', async () => {
		await saveAllocation(TEST_ACTOR, masterBillId, 'area');
		await saveAllocation(TEST_ACTOR, masterBillId, 'equal');

		const current = await getAllocation(masterBillId);
		expect(current!.method).toBe('equal');
		expect(current!.lines).toHaveLength(2);
	});

	it('orders the remainder last when read back', async () => {
		await saveAllocation(TEST_ACTOR, masterBillId, 'submetered');
		const current = await getAllocation(masterBillId);

		expect(current!.lines).toHaveLength(3);
		expect(current!.lines.at(-1)!.isRemainder).toBe(true);
	});
});

describe('deleteAllocation', () => {
	it('removes the allocation and audits the removal', async () => {
		await saveAllocation(TEST_ACTOR, masterBillId, 'area');
		expect(await deleteAllocation(TEST_ACTOR, masterBillId)).toBe(true);
		expect(await getAllocation(masterBillId)).toBeUndefined();

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'bill_allocation'), eq(auditLog.action, 'delete')));
		expect(audits).toHaveLength(1);
	});

	it('reports false when there is nothing to delete', async () => {
		expect(await deleteAllocation(TEST_ACTOR, masterBillId)).toBe(false);
	});
});

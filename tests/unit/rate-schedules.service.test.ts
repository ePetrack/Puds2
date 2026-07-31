import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createProvider } from '$lib/server/services/providers';
import {
	createRateSchedule,
	updateRateSchedule,
	deleteRateSchedule,
	getRateSchedule,
	listRateSchedules
} from '$lib/server/services/rate-schedules';
import { ensureTestActor, TEST_ACTOR } from './setup';

let providerId: string;
let otherProviderId: string;

const input = (overrides: Record<string, unknown> = {}) =>
	({
		providerId,
		name: 'Standard Commercial',
		utilityType: 'electricity',
		rateType: 'flat',
		...overrides
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) as any;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, utility_accounts, rate_schedules, utility_providers CASCADE`
	);
	providerId = (
		await createProvider(TEST_ACTOR, {
			name: 'Grid Power',
			utilityTypes: ['electricity']
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)
	).id;
	otherProviderId = (
		await createProvider(TEST_ACTOR, {
			name: 'Metro Gas',
			utilityTypes: ['natural_gas']
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)
	).id;
});

describe('createRateSchedule', () => {
	it('stores the rate and audits it', async () => {
		const created = await createRateSchedule(TEST_ACTOR, input({ energyRate: 0.1234 }));

		expect(created.name).toBe('Standard Commercial');
		// Rates are numeric in Postgres, so they come back as strings — the precision is the
		// point of storing them that way rather than as floats.
		expect(Number(created.energyRate)).toBeCloseTo(0.1234, 6);

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'rate_schedule'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
		expect(audits[0].action).toBe('create');
	});

	it('leaves an omitted rate null rather than defaulting it to zero', async () => {
		// A zero rate and an unknown rate are different claims about a tariff.
		const created = await createRateSchedule(TEST_ACTOR, input());
		expect(created.energyRate).toBeNull();
		expect(created.demandRate).toBeNull();
		expect(created.fixedMonthlyCharge).toBeNull();
	});
});

describe('updateRateSchedule', () => {
	it('records only the changed field', async () => {
		const created = await createRateSchedule(TEST_ACTOR, input({ energyRate: 0.1 }));
		await updateRateSchedule(TEST_ACTOR, created.id, input({ energyRate: 0.2 }));

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'rate_schedule'), eq(auditLog.entityId, created.id)));
		const update = audits.find((a) => a.action === 'update')!;
		expect(Object.keys(update.changes as object)).toEqual(['energyRate']);
	});

	it('returns undefined for an unknown id', async () => {
		expect(
			await updateRateSchedule(TEST_ACTOR, '00000000-0000-4000-8000-000000000000', input())
		).toBeUndefined();
	});
});

describe('deleteRateSchedule', () => {
	it('removes it and reports false the second time', async () => {
		const created = await createRateSchedule(TEST_ACTOR, input());
		expect(await deleteRateSchedule(TEST_ACTOR, created.id)).toBe(true);
		expect(await getRateSchedule(created.id)).toBeUndefined();
		expect(await deleteRateSchedule(TEST_ACTOR, created.id)).toBe(false);
	});
});

describe('listRateSchedules', () => {
	beforeEach(async () => {
		await createRateSchedule(TEST_ACTOR, input({ name: 'Zone B', utilityType: 'electricity' }));
		await createRateSchedule(TEST_ACTOR, input({ name: 'Alpha Tariff', utilityType: 'water' }));
		await createRateSchedule(
			TEST_ACTOR,
			input({ providerId: otherProviderId, name: 'Gas Standard', utilityType: 'natural_gas' })
		);
	});

	it('orders by name and resolves the provider', async () => {
		const all = await listRateSchedules();
		expect(all.map((r) => r.name)).toEqual(['Alpha Tariff', 'Gas Standard', 'Zone B']);
		expect(all.find((r) => r.name === 'Gas Standard')!.providerName).toBe('Metro Gas');
	});

	it('filters by provider', async () => {
		const rows = await listRateSchedules({ providerId: otherProviderId });
		expect(rows.map((r) => r.name)).toEqual(['Gas Standard']);
	});

	it('filters by utility type', async () => {
		const rows = await listRateSchedules({ utilityType: 'water' });
		expect(rows.map((r) => r.name)).toEqual(['Alpha Tariff']);
	});

	it('applies both filters together rather than either', async () => {
		expect(
			await listRateSchedules({ providerId: otherProviderId, utilityType: 'water' })
		).toHaveLength(0);
	});
});

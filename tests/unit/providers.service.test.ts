import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import {
	createProvider,
	updateProvider,
	deleteProvider,
	getProvider,
	listProviders
} from '$lib/server/services/providers';
import { ensureTestActor, TEST_ACTOR } from './setup';

const input = (overrides: Record<string, unknown> = {}) =>
	({
		name: 'Grid Power',
		utilityTypes: ['electricity'],
		...overrides
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) as any;

async function auditFor(id: string) {
	return db
		.select()
		.from(auditLog)
		.where(and(eq(auditLog.entity, 'utility_provider'), eq(auditLog.entityId, id)));
}

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, utility_accounts, rate_schedules, utility_providers CASCADE`
	);
});

describe('createProvider', () => {
	it('stores the record and audits the creation', async () => {
		const created = await createProvider(TEST_ACTOR, input({ accountManager: 'Dana' }));

		expect(created.name).toBe('Grid Power');
		expect(created.utilityTypes).toEqual(['electricity']);

		const audits = await auditFor(created.id);
		expect(audits).toHaveLength(1);
		expect(audits[0].action).toBe('create');
		expect(audits[0].changes).toMatchObject({ name: { from: null, to: 'Grid Power' } });
	});

	it('normalises omitted optional fields to null rather than undefined', async () => {
		const created = await createProvider(TEST_ACTOR, input());
		expect(created.accountManager).toBeNull();
		expect(created.notes).toBeNull();
	});

	it('keeps the utility-type array intact', async () => {
		// `utility_types` is a Postgres array; a single-element round trip is the easy case,
		// several is where a bad cast shows up.
		const created = await createProvider(
			TEST_ACTOR,
			input({ utilityTypes: ['electricity', 'natural_gas', 'water'] })
		);
		expect(created.utilityTypes).toEqual(['electricity', 'natural_gas', 'water']);
	});
});

describe('updateProvider', () => {
	it('records only what changed', async () => {
		const created = await createProvider(TEST_ACTOR, input({ phone: '555-0100' }));
		await updateProvider(
			TEST_ACTOR,
			created.id,
			input({ name: 'Grid Power Co', phone: '555-0100' })
		);

		const audits = await auditFor(created.id);
		const update = audits.find((a) => a.action === 'update')!;
		expect(update.changes).toEqual({ name: { from: 'Grid Power', to: 'Grid Power Co' } });
	});

	it('returns undefined for an id that does not exist, without auditing', async () => {
		const missing = await updateProvider(
			TEST_ACTOR,
			'00000000-0000-4000-8000-000000000000',
			input()
		);
		expect(missing).toBeUndefined();
		expect(await db.select().from(auditLog)).toHaveLength(0);
	});
});

describe('deleteProvider', () => {
	it('removes the provider and audits it', async () => {
		const created = await createProvider(TEST_ACTOR, input());
		expect(await deleteProvider(TEST_ACTOR, created.id)).toBe(true);
		expect(await getProvider(created.id)).toBeUndefined();

		const audits = await auditFor(created.id);
		expect(audits.some((a) => a.action === 'delete')).toBe(true);
	});

	it('reports false for an unknown id rather than throwing', async () => {
		expect(await deleteProvider(TEST_ACTOR, '00000000-0000-4000-8000-000000000000')).toBe(false);
	});
});

describe('listProviders', () => {
	it('orders by name', async () => {
		await createProvider(TEST_ACTOR, input({ name: 'Zephyr Gas' }));
		await createProvider(TEST_ACTOR, input({ name: 'Acme Electric' }));

		expect((await listProviders()).map((p) => p.name)).toEqual(['Acme Electric', 'Zephyr Gas']);
	});
});

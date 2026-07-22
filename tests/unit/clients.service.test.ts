import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import {
	createClient,
	getClient,
	listClients,
	updateClient,
	deleteClient
} from '$lib/server/services/clients';
import { clientSchema } from '$lib/schemas/client';
import { resetDomainTables, ensureTestActor, TEST_ACTOR } from './setup';

const validInput = {
	name: 'Test University',
	status: 'active' as const,
	contactEmail: 'contact@test.edu',
	city: 'Testville',
	contractValue: 100000
};

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetDomainTables();
});

describe('clientSchema', () => {
	it('accepts a minimal valid payload', () => {
		const result = clientSchema.safeParse({ name: 'X', status: 'active' });
		expect(result.success).toBe(true);
	});

	it('rejects a missing name', () => {
		const result = clientSchema.safeParse({ name: '', status: 'active' });
		expect(result.success).toBe(false);
	});

	it('rejects an invalid email', () => {
		const result = clientSchema.safeParse({
			name: 'X',
			status: 'active',
			contactEmail: 'not-an-email'
		});
		expect(result.success).toBe(false);
	});

	it('treats empty strings as absent optional fields', () => {
		const result = clientSchema.parse({
			name: 'X',
			status: 'active',
			contactEmail: '',
			contractValue: ''
		});
		expect(result.contactEmail).toBeUndefined();
		expect(result.contractValue).toBeUndefined();
	});
});

describe('clients service', () => {
	it('creates a client and writes an audit entry', async () => {
		const created = await createClient(TEST_ACTOR, validInput);
		expect(created.id).toBeTruthy();
		expect(created.name).toBe('Test University');
		expect(Number(created.contractValue)).toBe(100000);

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'client'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
		expect(audits[0].action).toBe('create');
		expect(audits[0].actorId).toBe(TEST_ACTOR);
	});

	it('reads a client back', async () => {
		const created = await createClient(TEST_ACTOR, validInput);
		const fetched = await getClient(created.id);
		expect(fetched?.name).toBe('Test University');
	});

	it('updates a client and records only the changed fields', async () => {
		const created = await createClient(TEST_ACTOR, validInput);
		const updated = await updateClient(TEST_ACTOR, created.id, {
			...validInput,
			name: 'Renamed University'
		});
		expect(updated?.name).toBe('Renamed University');

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'client'), eq(auditLog.entityId, created.id)));
		const updateEntry = audits.find((a) => a.action === 'update');
		expect(updateEntry).toBeDefined();
		const changes = updateEntry!.changes as Record<string, { from: unknown; to: unknown }>;
		expect(changes.name).toEqual({ from: 'Test University', to: 'Renamed University' });
		expect(changes.city).toBeUndefined();
	});

	it('returns undefined when updating a nonexistent client', async () => {
		const result = await updateClient(
			TEST_ACTOR,
			'00000000-0000-0000-0000-000000000000',
			validInput
		);
		expect(result).toBeUndefined();
	});

	it('deletes a client and records the deletion', async () => {
		const created = await createClient(TEST_ACTOR, validInput);
		expect(await deleteClient(TEST_ACTOR, created.id)).toBe(true);
		expect(await getClient(created.id)).toBeUndefined();

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'client'), eq(auditLog.entityId, created.id)));
		expect(audits.map((a) => a.action).sort()).toEqual(['create', 'delete']);
	});

	it('paginates and filters the list', async () => {
		await createClient(TEST_ACTOR, { ...validInput, name: 'Alpha U', status: 'active' });
		await createClient(TEST_ACTOR, { ...validInput, name: 'Beta College', status: 'inactive' });
		await createClient(TEST_ACTOR, { ...validInput, name: 'Gamma Institute', status: 'active' });

		const all = await listClients();
		expect(all.total).toBe(3);

		const active = await listClients({ status: 'active' });
		expect(active.total).toBe(2);

		const searched = await listClients({ search: 'beta' });
		expect(searched.total).toBe(1);
		expect(searched.items[0].name).toBe('Beta College');

		const paged = await listClients({ page: 2, perPage: 2 });
		expect(paged.items).toHaveLength(1);
		expect(paged.totalPages).toBe(2);
	});
});

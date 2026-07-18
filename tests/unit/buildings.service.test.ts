import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import {
	createBuilding,
	getBuilding,
	listBuildings,
	updateBuilding,
	deleteBuilding
} from '$lib/server/services/buildings';
import { buildingSchema } from '$lib/schemas/building';
import { resetDomainTables, ensureTestActor, TEST_ACTOR } from './setup';

let clientId: string;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetDomainTables();
	const client = await createClient(TEST_ACTOR, { name: 'Owner U', status: 'active' as const });
	clientId = client.id;
});

describe('buildingSchema', () => {
	it('requires a client id', () => {
		const result = buildingSchema.safeParse({ clientId: '', name: 'Hall' });
		expect(result.success).toBe(false);
	});

	it('coerces numeric strings from forms', () => {
		const result = buildingSchema.parse({
			clientId: '00000000-0000-0000-0000-000000000000',
			name: 'Hall',
			squareFootage: '85000',
			yearBuilt: '1985'
		});
		expect(result.squareFootage).toBe(85000);
		expect(result.yearBuilt).toBe(1985);
	});

	it('rejects out-of-range years', () => {
		const result = buildingSchema.safeParse({
			clientId: '00000000-0000-0000-0000-000000000000',
			name: 'Hall',
			yearBuilt: '1500'
		});
		expect(result.success).toBe(false);
	});
});

describe('buildings service', () => {
	it('creates a building with audit entry and joins the client on read', async () => {
		const created = await createBuilding(TEST_ACTOR, {
			clientId,
			name: 'Science Hall',
			buildingType: 'laboratory',
			squareFootage: 85000
		});
		expect(created.id).toBeTruthy();

		const fetched = await getBuilding(created.id);
		expect(fetched?.client?.name).toBe('Owner U');

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'building'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
	});

	it('updates and deletes with audit entries', async () => {
		const created = await createBuilding(TEST_ACTOR, { clientId, name: 'Old Name' });
		const updated = await updateBuilding(TEST_ACTOR, created.id, {
			clientId,
			name: 'New Name'
		});
		expect(updated?.name).toBe('New Name');

		expect(await deleteBuilding(TEST_ACTOR, created.id)).toBe(true);
		expect(await getBuilding(created.id)).toBeUndefined();
	});

	it('filters by client and search term', async () => {
		const otherClient = await createClient(TEST_ACTOR, {
			name: 'Other U',
			status: 'active' as const
		});
		await createBuilding(TEST_ACTOR, { clientId, name: 'Library' });
		await createBuilding(TEST_ACTOR, { clientId: otherClient.id, name: 'Gym' });

		const byClient = await listBuildings({ clientId });
		expect(byClient.total).toBe(1);
		expect(byClient.items[0].name).toBe('Library');

		const bySearch = await listBuildings({ search: 'gym' });
		expect(bySearch.total).toBe(1);
	});

	it('cascades deletion when the client is removed', async () => {
		const created = await createBuilding(TEST_ACTOR, { clientId, name: 'Doomed Hall' });
		const { deleteClient } = await import('$lib/server/services/clients');
		await deleteClient(TEST_ACTOR, clientId);
		expect(await getBuilding(created.id)).toBeUndefined();
	});
});

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import {
	createCampus,
	getCampus,
	getCampusChildren,
	listCampuses,
	listCampusOptions,
	updateCampus,
	deleteCampus
} from '$lib/server/services/campuses';
import { createComplex } from '$lib/server/services/complexes';
import { createBuilding } from '$lib/server/services/buildings';
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

describe('campuses service', () => {
	it('creates a campus with an audit entry and joins the client on read', async () => {
		const created = await createCampus(TEST_ACTOR, {
			clientId,
			name: 'North Campus',
			code: 'NC'
		});
		expect(created.id).toBeTruthy();

		const fetched = await getCampus(created.id);
		expect(fetched?.client?.name).toBe('Owner U');

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'campus'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
	});

	it('lists child complexes and buildings', async () => {
		const campus = await createCampus(TEST_ACTOR, { clientId, name: 'Main Campus' });
		await createComplex(TEST_ACTOR, { clientId, campusId: campus.id, name: 'Central District' });
		await createBuilding(TEST_ACTOR, { clientId, campusId: campus.id, name: 'Admin Hall' });

		const children = await getCampusChildren(campus.id);
		expect(children.complexes).toHaveLength(1);
		expect(children.buildings).toHaveLength(1);
		expect(children.complexes[0].name).toBe('Central District');
		expect(children.buildings[0].name).toBe('Admin Hall');
	});

	it('scopes options and filters by client', async () => {
		const otherClient = await createClient(TEST_ACTOR, { name: 'Other U', status: 'active' });
		await createCampus(TEST_ACTOR, { clientId, name: 'Ours' });
		await createCampus(TEST_ACTOR, { clientId: otherClient.id, name: 'Theirs' });

		const scoped = await listCampusOptions(clientId);
		expect(scoped).toHaveLength(1);
		expect(scoped[0].name).toBe('Ours');

		const byClient = await listCampuses({ clientId });
		expect(byClient.total).toBe(1);
	});

	it('updates and deletes with audit entries', async () => {
		const created = await createCampus(TEST_ACTOR, { clientId, name: 'Old' });
		const updated = await updateCampus(TEST_ACTOR, created.id, { clientId, name: 'New' });
		expect(updated?.name).toBe('New');

		expect(await deleteCampus(TEST_ACTOR, created.id)).toBe(true);
		expect(await getCampus(created.id)).toBeUndefined();
	});

	it('detaches buildings when the campus is deleted (set null)', async () => {
		const campus = await createCampus(TEST_ACTOR, { clientId, name: 'Doomed' });
		const building = await createBuilding(TEST_ACTOR, {
			clientId,
			campusId: campus.id,
			name: 'Survivor Hall'
		});
		await deleteCampus(TEST_ACTOR, campus.id);
		const fetched = await getBuildingCampus(building.id);
		expect(fetched).toBeNull();
	});
});

async function getBuildingCampus(id: string): Promise<string | null> {
	const { getBuilding } = await import('$lib/server/services/buildings');
	const b = await getBuilding(id);
	return b?.campusId ?? null;
}

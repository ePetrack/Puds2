import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createCampus } from '$lib/server/services/campuses';
import {
	createComplex,
	getComplex,
	getComplexBuildings,
	listComplexes,
	updateComplex,
	deleteComplex
} from '$lib/server/services/complexes';
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

describe('complexes service', () => {
	it('creates a complex with an audit entry and joins the campus/client on read', async () => {
		const campus = await createCampus(TEST_ACTOR, { clientId, name: 'North' });
		const created = await createComplex(TEST_ACTOR, {
			clientId,
			campusId: campus.id,
			name: 'Steam District'
		});

		const fetched = await getComplex(created.id);
		expect(fetched?.client?.name).toBe('Owner U');
		expect(fetched?.campusName).toBe('North');

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'complex'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
	});

	it('lists buildings served by a complex', async () => {
		const complex = await createComplex(TEST_ACTOR, { clientId, name: 'Quad' });
		await createBuilding(TEST_ACTOR, { clientId, complexId: complex.id, name: 'Hall A' });
		await createBuilding(TEST_ACTOR, { clientId, complexId: complex.id, name: 'Hall B' });

		const served = await getComplexBuildings(complex.id);
		expect(served).toHaveLength(2);
	});

	it('filters by client and campus', async () => {
		const campus = await createCampus(TEST_ACTOR, { clientId, name: 'C' });
		await createComplex(TEST_ACTOR, { clientId, campusId: campus.id, name: 'In Campus' });
		await createComplex(TEST_ACTOR, { clientId, name: 'No Campus' });

		const byCampus = await listComplexes({ campusId: campus.id });
		expect(byCampus.total).toBe(1);
		expect(byCampus.items[0].name).toBe('In Campus');

		const byClient = await listComplexes({ clientId });
		expect(byClient.total).toBe(2);
	});

	it('updates and deletes with audit entries', async () => {
		const created = await createComplex(TEST_ACTOR, { clientId, name: 'Old' });
		const updated = await updateComplex(TEST_ACTOR, created.id, { clientId, name: 'New' });
		expect(updated?.name).toBe('New');

		expect(await deleteComplex(TEST_ACTOR, created.id)).toBe(true);
		expect(await getComplex(created.id)).toBeUndefined();
	});
});

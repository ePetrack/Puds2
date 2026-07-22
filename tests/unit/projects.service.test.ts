import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import {
	createProject,
	getProject,
	listProjects,
	updateProject,
	deleteProject
} from '$lib/server/services/projects';
import { ensureTestActor, TEST_ACTOR } from './setup';

let clientId: string;
let buildingA: string;
let buildingB: string;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(sql`TRUNCATE TABLE audit_log, projects, buildings, clients CASCADE`);
	const client = await createClient(TEST_ACTOR, { name: 'Proj U', status: 'active' as const });
	clientId = client.id;
	buildingA = (await createBuilding(TEST_ACTOR, { clientId, name: 'Hall A' })).id;
	buildingB = (await createBuilding(TEST_ACTOR, { clientId, name: 'Hall B' })).id;
});

describe('projects service', () => {
	it('creates a project with building links and an audit entry', async () => {
		const created = await createProject(TEST_ACTOR, {
			clientId,
			name: 'HVAC Upgrade',
			status: 'planning',
			budget: 450000,
			buildingIds: [buildingA, buildingB]
		});

		const detail = await getProject(created.id);
		expect(detail?.buildings.map((b) => b.name).sort()).toEqual(['Hall A', 'Hall B']);
		expect(Number(detail?.budget)).toBe(450000);

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'project'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
	});

	it('replaces building links on update', async () => {
		const created = await createProject(TEST_ACTOR, {
			clientId,
			name: 'Retrofit',
			status: 'planning',
			buildingIds: [buildingA]
		});

		await updateProject(TEST_ACTOR, created.id, {
			clientId,
			name: 'Retrofit',
			status: 'in_progress',
			buildingIds: [buildingB]
		});

		const detail = await getProject(created.id);
		expect(detail?.status).toBe('in_progress');
		expect(detail?.buildings.map((b) => b.name)).toEqual(['Hall B']);
	});

	it('filters the list by status and reports building counts', async () => {
		await createProject(TEST_ACTOR, {
			clientId,
			name: 'One',
			status: 'planning',
			buildingIds: [buildingA, buildingB]
		});
		await createProject(TEST_ACTOR, {
			clientId,
			name: 'Two',
			status: 'completed',
			buildingIds: []
		});

		const all = await listProjects();
		expect(all.total).toBe(2);
		expect(all.items.find((p) => p.name === 'One')?.buildingCount).toBe(2);

		const completed = await listProjects({ status: 'completed' });
		expect(completed.total).toBe(1);
	});

	it('deletes a project and its links', async () => {
		const created = await createProject(TEST_ACTOR, {
			clientId,
			name: 'Doomed',
			status: 'planning',
			buildingIds: [buildingA]
		});
		expect(await deleteProject(TEST_ACTOR, created.id)).toBe(true);
		expect(await getProject(created.id)).toBeUndefined();
	});
});

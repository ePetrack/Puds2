import { and, count, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { projects, projectBuildings, clients, buildings, type Project } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { ProjectInput } from '$lib/schemas/project';
import type { Paginated } from './clients';

export type ProjectWithRefs = Project & {
	clientName: string | null;
	buildingCount: number;
};

export type ProjectDetail = Project & {
	clientName: string | null;
	buildings: { id: string; name: string }[];
};

function toRow(input: ProjectInput) {
	const money = (v: number | undefined) => (v !== undefined ? String(v) : null);
	return {
		clientId: input.clientId,
		name: input.name,
		description: input.description ?? null,
		status: input.status,
		startDate: input.startDate ?? null,
		endDate: input.endDate ?? null,
		budget: money(input.budget),
		actualCost: money(input.actualCost),
		expectedAnnualSavings: money(input.expectedAnnualSavings),
		actualAnnualSavings: money(input.actualAnnualSavings),
		roiYears: money(input.roiYears),
		notes: input.notes ?? null
	};
}

export interface ProjectListParams {
	page?: number;
	perPage?: number;
	search?: string;
	clientId?: string;
	status?: Project['status'];
}

export async function listProjects(
	params: ProjectListParams = {}
): Promise<Paginated<ProjectWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) conditions.push(ilike(projects.name, `%${params.search}%`));
	if (params.clientId) conditions.push(eq(projects.clientId, params.clientId));
	if (params.status) conditions.push(eq(projects.status, params.status));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select({ project: projects, clientName: clients.name })
			.from(projects)
			.leftJoin(clients, eq(projects.clientId, clients.id))
			.where(where)
			.orderBy(desc(projects.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(projects).where(where)
	]);

	// Building counts for the page's projects
	const ids = rows.map((r) => r.project.id);
	const countsByProject = new Map<string, number>();
	if (ids.length > 0) {
		const links = await db
			.select({ projectId: projectBuildings.projectId, value: count() })
			.from(projectBuildings)
			.where(inArray(projectBuildings.projectId, ids))
			.groupBy(projectBuildings.projectId);
		for (const l of links) countsByProject.set(l.projectId, l.value);
	}

	return {
		items: rows.map((r) => ({
			...r.project,
			clientName: r.clientName,
			buildingCount: countsByProject.get(r.project.id) ?? 0
		})),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function getProject(id: string): Promise<ProjectDetail | undefined> {
	const [row] = await db
		.select({ project: projects, clientName: clients.name })
		.from(projects)
		.leftJoin(clients, eq(projects.clientId, clients.id))
		.where(eq(projects.id, id));
	if (!row) return undefined;

	const linked = await db
		.select({ id: buildings.id, name: buildings.name })
		.from(projectBuildings)
		.innerJoin(buildings, eq(projectBuildings.buildingId, buildings.id))
		.where(eq(projectBuildings.projectId, id));

	return { ...row.project, clientName: row.clientName, buildings: linked };
}

export async function createProject(actorId: string, input: ProjectInput): Promise<Project> {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(projects).values(toRow(input)).returning();
		if (input.buildingIds.length > 0) {
			await tx
				.insert(projectBuildings)
				.values(input.buildingIds.map((buildingId) => ({ projectId: created.id, buildingId })));
		}
		await recordAudit(tx, {
			actorId,
			entity: 'project',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, { ...toRow(input), buildingIds: input.buildingIds })
		});
		return created;
	});
}

export async function updateProject(
	actorId: string,
	id: string,
	input: ProjectInput
): Promise<Project | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(projects).where(eq(projects.id, id));
		if (!before) return undefined;

		const row = toRow(input);
		const [updated] = await tx
			.update(projects)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(projects.id, id))
			.returning();

		// Replace building links wholesale
		await tx.delete(projectBuildings).where(eq(projectBuildings.projectId, id));
		if (input.buildingIds.length > 0) {
			await tx
				.insert(projectBuildings)
				.values(input.buildingIds.map((buildingId) => ({ projectId: id, buildingId })));
		}

		await recordAudit(tx, {
			actorId,
			entity: 'project',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteProject(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(projects).where(eq(projects.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'project',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

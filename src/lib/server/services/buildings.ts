import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { buildings, clients, campuses, complexes, type Building, type Client } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { BuildingInput } from '$lib/schemas/building';
import type { Paginated } from './clients';

export interface BuildingListParams {
	page?: number;
	perPage?: number;
	search?: string;
	clientId?: string;
	campusId?: string;
	complexId?: string;
}

export type BuildingWithClient = Building & {
	client: Pick<Client, 'id' | 'name'> | null;
	campusName: string | null;
	complexName: string | null;
};

function toRow(input: BuildingInput) {
	return {
		clientId: input.clientId,
		campusId: input.campusId ?? null,
		complexId: input.complexId ?? null,
		name: input.name,
		buildingType: input.buildingType ?? null,
		squareFootage: input.squareFootage ?? null,
		yearBuilt: input.yearBuilt ?? null,
		floors: input.floors ?? null,
		occupancy: input.occupancy ?? null,
		address: input.address ?? null,
		notes: input.notes ?? null
	};
}

export async function listBuildings(
	params: BuildingListParams = {}
): Promise<Paginated<BuildingWithClient>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) {
		conditions.push(ilike(buildings.name, `%${params.search}%`));
	}
	if (params.clientId) {
		conditions.push(eq(buildings.clientId, params.clientId));
	}
	if (params.campusId) {
		conditions.push(eq(buildings.campusId, params.campusId));
	}
	if (params.complexId) {
		conditions.push(eq(buildings.complexId, params.complexId));
	}
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select({
				building: buildings,
				clientId: clients.id,
				clientName: clients.name,
				campusName: campuses.name,
				complexName: complexes.name
			})
			.from(buildings)
			.leftJoin(clients, eq(buildings.clientId, clients.id))
			.leftJoin(campuses, eq(buildings.campusId, campuses.id))
			.leftJoin(complexes, eq(buildings.complexId, complexes.id))
			.where(where)
			.orderBy(desc(buildings.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(buildings).where(where)
	]);

	const items: BuildingWithClient[] = rows.map((r) => ({
		...r.building,
		client: r.clientId ? { id: r.clientId, name: r.clientName! } : null,
		campusName: r.campusName,
		complexName: r.complexName
	}));

	return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getBuilding(id: string): Promise<BuildingWithClient | undefined> {
	const [row] = await db
		.select({
			building: buildings,
			clientId: clients.id,
			clientName: clients.name,
			campusName: campuses.name,
			complexName: complexes.name
		})
		.from(buildings)
		.leftJoin(clients, eq(buildings.clientId, clients.id))
		.leftJoin(campuses, eq(buildings.campusId, campuses.id))
		.leftJoin(complexes, eq(buildings.complexId, complexes.id))
		.where(eq(buildings.id, id));
	if (!row) return undefined;
	return {
		...row.building,
		client: row.clientId ? { id: row.clientId, name: row.clientName! } : null,
		campusName: row.campusName,
		complexName: row.complexName
	};
}

export async function createBuilding(actorId: string, input: BuildingInput): Promise<Building> {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(buildings).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'building',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateBuilding(
	actorId: string,
	id: string,
	input: BuildingInput
): Promise<Building | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(buildings).where(eq(buildings.id, id));
		if (!before) return undefined;

		const row = toRow(input);
		const [updated] = await tx
			.update(buildings)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(buildings.id, id))
			.returning();

		await recordAudit(tx, {
			actorId,
			entity: 'building',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteBuilding(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(buildings).where(eq(buildings.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'building',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

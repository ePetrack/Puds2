import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { campuses, clients, buildings, complexes, type Campus, type Client } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { CampusInput } from '$lib/schemas/campus';
import type { Paginated } from './clients';

export interface CampusListParams {
	page?: number;
	perPage?: number;
	search?: string;
	clientId?: string;
}

export type CampusWithClient = Campus & { client: Pick<Client, 'id' | 'name'> | null };

function toRow(input: CampusInput) {
	return {
		clientId: input.clientId,
		name: input.name,
		code: input.code ?? null,
		address: input.address ?? null,
		city: input.city ?? null,
		state: input.state ?? null,
		zip: input.zip ?? null,
		notes: input.notes ?? null
	};
}

export async function listCampuses(
	params: CampusListParams = {}
): Promise<Paginated<CampusWithClient>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) conditions.push(ilike(campuses.name, `%${params.search}%`));
	if (params.clientId) conditions.push(eq(campuses.clientId, params.clientId));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select({ campus: campuses, clientId: clients.id, clientName: clients.name })
			.from(campuses)
			.leftJoin(clients, eq(campuses.clientId, clients.id))
			.where(where)
			.orderBy(desc(campuses.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(campuses).where(where)
	]);

	const items: CampusWithClient[] = rows.map((r) => ({
		...r.campus,
		client: r.clientId ? { id: r.clientId, name: r.clientName! } : null
	}));

	return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getCampus(id: string): Promise<CampusWithClient | undefined> {
	const [row] = await db
		.select({ campus: campuses, clientId: clients.id, clientName: clients.name })
		.from(campuses)
		.leftJoin(clients, eq(campuses.clientId, clients.id))
		.where(eq(campuses.id, id));
	if (!row) return undefined;
	return {
		...row.campus,
		client: row.clientId ? { id: row.clientId, name: row.clientName! } : null
	};
}

/** Buildings and complexes that belong to a campus, for its detail page. */
export async function getCampusChildren(id: string) {
	const [complexRows, buildingRows] = await Promise.all([
		db
			.select({ id: complexes.id, name: complexes.name, code: complexes.code })
			.from(complexes)
			.where(eq(complexes.campusId, id))
			.orderBy(asc(complexes.name)),
		db
			.select({ id: buildings.id, name: buildings.name, complexId: buildings.complexId })
			.from(buildings)
			.where(eq(buildings.campusId, id))
			.orderBy(asc(buildings.name))
	]);
	return { complexes: complexRows, buildings: buildingRows };
}

/** Lightweight list for select inputs, optionally scoped to a client. */
export async function listCampusOptions(
	clientId?: string
): Promise<{ id: string; name: string; clientId: string }[]> {
	return db
		.select({ id: campuses.id, name: campuses.name, clientId: campuses.clientId })
		.from(campuses)
		.where(clientId ? eq(campuses.clientId, clientId) : undefined)
		.orderBy(asc(campuses.name));
}

export async function createCampus(actorId: string, input: CampusInput): Promise<Campus> {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(campuses).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'campus',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateCampus(
	actorId: string,
	id: string,
	input: CampusInput
): Promise<Campus | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(campuses).where(eq(campuses.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(campuses)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(campuses.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'campus',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteCampus(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(campuses).where(eq(campuses.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'campus',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

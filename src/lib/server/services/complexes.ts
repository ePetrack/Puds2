import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { complexes, campuses, clients, buildings, type Complex, type Client } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { ComplexInput } from '$lib/schemas/complex';
import type { Paginated } from './clients';

export interface ComplexListParams {
	page?: number;
	perPage?: number;
	search?: string;
	clientId?: string;
	campusId?: string;
}

export type ComplexWithRefs = Complex & {
	client: Pick<Client, 'id' | 'name'> | null;
	campusName: string | null;
};

function toRow(input: ComplexInput) {
	return {
		clientId: input.clientId,
		campusId: input.campusId ?? null,
		name: input.name,
		code: input.code ?? null,
		description: input.description ?? null,
		notes: input.notes ?? null
	};
}

export async function listComplexes(
	params: ComplexListParams = {}
): Promise<Paginated<ComplexWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) conditions.push(ilike(complexes.name, `%${params.search}%`));
	if (params.clientId) conditions.push(eq(complexes.clientId, params.clientId));
	if (params.campusId) conditions.push(eq(complexes.campusId, params.campusId));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select({
				complex: complexes,
				clientId: clients.id,
				clientName: clients.name,
				campusName: campuses.name
			})
			.from(complexes)
			.leftJoin(clients, eq(complexes.clientId, clients.id))
			.leftJoin(campuses, eq(complexes.campusId, campuses.id))
			.where(where)
			.orderBy(desc(complexes.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(complexes).where(where)
	]);

	const items: ComplexWithRefs[] = rows.map((r) => ({
		...r.complex,
		client: r.clientId ? { id: r.clientId, name: r.clientName! } : null,
		campusName: r.campusName
	}));

	return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getComplex(id: string): Promise<ComplexWithRefs | undefined> {
	const [row] = await db
		.select({
			complex: complexes,
			clientId: clients.id,
			clientName: clients.name,
			campusName: campuses.name
		})
		.from(complexes)
		.leftJoin(clients, eq(complexes.clientId, clients.id))
		.leftJoin(campuses, eq(complexes.campusId, campuses.id))
		.where(eq(complexes.id, id));
	if (!row) return undefined;
	return {
		...row.complex,
		client: row.clientId ? { id: row.clientId, name: row.clientName! } : null,
		campusName: row.campusName
	};
}

/** Buildings served by a complex, for its detail page. */
export async function getComplexBuildings(id: string) {
	return db
		.select({ id: buildings.id, name: buildings.name })
		.from(buildings)
		.where(eq(buildings.complexId, id))
		.orderBy(asc(buildings.name));
}

/** Lightweight list for select inputs, optionally scoped to a client and/or campus. */
export async function listComplexOptions(
	clientId?: string,
	campusId?: string
): Promise<{ id: string; name: string; clientId: string; campusId: string | null }[]> {
	const conditions: SQL[] = [];
	if (clientId) conditions.push(eq(complexes.clientId, clientId));
	if (campusId) conditions.push(eq(complexes.campusId, campusId));
	return db
		.select({
			id: complexes.id,
			name: complexes.name,
			clientId: complexes.clientId,
			campusId: complexes.campusId
		})
		.from(complexes)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(complexes.name));
}

export async function createComplex(actorId: string, input: ComplexInput): Promise<Complex> {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(complexes).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'complex',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateComplex(
	actorId: string,
	id: string,
	input: ComplexInput
): Promise<Complex | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(complexes).where(eq(complexes.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(complexes)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(complexes.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'complex',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteComplex(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(complexes).where(eq(complexes.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'complex',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

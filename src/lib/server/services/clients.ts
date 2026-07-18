import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { clients, type Client } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { ClientInput } from '$lib/schemas/client';

export interface ClientListParams {
	page?: number;
	perPage?: number;
	search?: string;
	status?: Client['status'];
}

export interface Paginated<T> {
	items: T[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

function toRow(input: ClientInput) {
	return {
		name: input.name,
		contactName: input.contactName ?? null,
		contactEmail: input.contactEmail ?? null,
		contactPhone: input.contactPhone ?? null,
		address: input.address ?? null,
		city: input.city ?? null,
		state: input.state ?? null,
		zip: input.zip ?? null,
		contractStartDate: input.contractStartDate ?? null,
		contractEndDate: input.contractEndDate ?? null,
		contractValue: input.contractValue !== undefined ? String(input.contractValue) : null,
		status: input.status,
		notes: input.notes ?? null
	};
}

export async function listClients(params: ClientListParams = {}): Promise<Paginated<Client>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) {
		const term = `%${params.search}%`;
		const searchCond = or(
			ilike(clients.name, term),
			ilike(clients.contactName, term),
			ilike(clients.city, term)
		);
		if (searchCond) conditions.push(searchCond);
	}
	if (params.status) {
		conditions.push(eq(clients.status, params.status));
	}
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [items, [{ value: total }]] = await Promise.all([
		db
			.select()
			.from(clients)
			.where(where)
			.orderBy(desc(clients.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(clients).where(where)
	]);

	return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getClient(id: string): Promise<Client | undefined> {
	return db.query.clients.findFirst({ where: eq(clients.id, id) });
}

export async function createClient(actorId: string, input: ClientInput): Promise<Client> {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(clients).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'client',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateClient(
	actorId: string,
	id: string,
	input: ClientInput
): Promise<Client | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(clients).where(eq(clients.id, id));
		if (!before) return undefined;

		const row = toRow(input);
		const [updated] = await tx
			.update(clients)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(clients.id, id))
			.returning();

		await recordAudit(tx, {
			actorId,
			entity: 'client',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteClient(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(clients).where(eq(clients.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'client',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

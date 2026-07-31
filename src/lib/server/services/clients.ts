import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { clients, type Client } from '../db/schema';
import { auditedInsert, auditedUpdate, auditedDelete } from './audited';
import type { ClientInput } from '$lib/schemas/client';
import type { Paginated } from './pagination';

export interface ClientListParams {
	page?: number;
	perPage?: number;
	search?: string;
	status?: Client['status'];
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
	return auditedInsert(actorId, clients, 'client', toRow(input));
}

export async function updateClient(
	actorId: string,
	id: string,
	input: ClientInput
): Promise<Client | undefined> {
	return auditedUpdate(actorId, clients, clients.id, 'client', id, toRow(input));
}

export async function deleteClient(actorId: string, id: string): Promise<boolean> {
	return auditedDelete(actorId, clients, clients.id, 'client', id, (deleted) => ({
		name: { from: deleted.name, to: null }
	}));
}

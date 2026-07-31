import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { utilityProviders, type UtilityProvider } from '../db/schema';
import { auditedInsert, auditedUpdate, auditedDelete } from './audited';
import type { ProviderInput } from '$lib/schemas/utility';

function toRow(input: ProviderInput) {
	return {
		name: input.name,
		utilityTypes: input.utilityTypes,
		accountManager: input.accountManager ?? null,
		phone: input.phone ?? null,
		email: input.email ?? null,
		website: input.website ?? null,
		address: input.address ?? null,
		notes: input.notes ?? null
	};
}

export async function listProviders(): Promise<UtilityProvider[]> {
	return db.select().from(utilityProviders).orderBy(asc(utilityProviders.name));
}

export async function getProvider(id: string): Promise<UtilityProvider | undefined> {
	return db.query.utilityProviders.findFirst({ where: eq(utilityProviders.id, id) });
}

export async function createProvider(actorId: string, input: ProviderInput) {
	return auditedInsert(actorId, utilityProviders, 'utility_provider', toRow(input));
}

export async function updateProvider(actorId: string, id: string, input: ProviderInput) {
	return auditedUpdate(
		actorId,
		utilityProviders,
		utilityProviders.id,
		'utility_provider',
		id,
		toRow(input)
	);
}

export async function deleteProvider(actorId: string, id: string): Promise<boolean> {
	return auditedDelete(
		actorId,
		utilityProviders,
		utilityProviders.id,
		'utility_provider',
		id,
		(deleted) => ({
			name: { from: deleted.name, to: null }
		})
	);
}

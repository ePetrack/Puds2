import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { utilityProviders, type UtilityProvider } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
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
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(utilityProviders).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'utility_provider',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateProvider(actorId: string, id: string, input: ProviderInput) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(utilityProviders).where(eq(utilityProviders.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(utilityProviders)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(utilityProviders.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'utility_provider',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteProvider(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx
			.delete(utilityProviders)
			.where(eq(utilityProviders.id, id))
			.returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'utility_provider',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

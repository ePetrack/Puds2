import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import {
	utilityAccounts,
	utilityProviders,
	rateSchedules,
	clients,
	type UtilityAccount
} from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { UtilityAccountInput } from '$lib/schemas/utility';

export type AccountWithRefs = UtilityAccount & {
	clientName: string | null;
	providerName: string | null;
	rateScheduleName: string | null;
};

function toRow(input: UtilityAccountInput) {
	return {
		clientId: input.clientId,
		providerId: input.providerId,
		accountNumber: input.accountNumber,
		utilityType: input.utilityType,
		status: input.status,
		rateScheduleId: input.rateScheduleId ?? null,
		serviceAddress: input.serviceAddress ?? null,
		startDate: input.startDate ?? null,
		endDate: input.endDate ?? null,
		notes: input.notes ?? null
	};
}

export async function listAccounts(
	filters: {
		clientId?: string;
		utilityType?: UtilityAccount['utilityType'];
		status?: UtilityAccount['status'];
	} = {}
): Promise<AccountWithRefs[]> {
	const conditions: SQL[] = [];
	if (filters.clientId) conditions.push(eq(utilityAccounts.clientId, filters.clientId));
	if (filters.utilityType) conditions.push(eq(utilityAccounts.utilityType, filters.utilityType));
	if (filters.status) conditions.push(eq(utilityAccounts.status, filters.status));

	const rows = await db
		.select({
			account: utilityAccounts,
			clientName: clients.name,
			providerName: utilityProviders.name,
			rateScheduleName: rateSchedules.name
		})
		.from(utilityAccounts)
		.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
		.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
		.leftJoin(rateSchedules, eq(utilityAccounts.rateScheduleId, rateSchedules.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(utilityAccounts.accountNumber));

	return rows.map((r) => ({
		...r.account,
		clientName: r.clientName,
		providerName: r.providerName,
		rateScheduleName: r.rateScheduleName
	}));
}

export async function getAccount(id: string): Promise<AccountWithRefs | undefined> {
	const rows = await db
		.select({
			account: utilityAccounts,
			clientName: clients.name,
			providerName: utilityProviders.name,
			rateScheduleName: rateSchedules.name
		})
		.from(utilityAccounts)
		.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
		.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
		.leftJoin(rateSchedules, eq(utilityAccounts.rateScheduleId, rateSchedules.id))
		.where(eq(utilityAccounts.id, id));
	const r = rows[0];
	if (!r) return undefined;
	return {
		...r.account,
		clientName: r.clientName,
		providerName: r.providerName,
		rateScheduleName: r.rateScheduleName
	};
}

export async function findAccountByNumber(
	accountNumber: string
): Promise<UtilityAccount | undefined> {
	return db.query.utilityAccounts.findFirst({
		where: eq(utilityAccounts.accountNumber, accountNumber)
	});
}

export async function createAccount(actorId: string, input: UtilityAccountInput) {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(utilityAccounts).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'utility_account',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateAccount(actorId: string, id: string, input: UtilityAccountInput) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(utilityAccounts).where(eq(utilityAccounts.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(utilityAccounts)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(utilityAccounts.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'utility_account',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteAccount(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx
			.delete(utilityAccounts)
			.where(eq(utilityAccounts.id, id))
			.returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'utility_account',
			entityId: id,
			action: 'delete',
			changes: { accountNumber: { from: deleted.accountNumber, to: null } }
		});
		return true;
	});
}

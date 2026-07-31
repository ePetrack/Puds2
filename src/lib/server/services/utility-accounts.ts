import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import {
	utilityAccounts,
	utilityProviders,
	rateSchedules,
	clients,
	type UtilityAccount
} from '../db/schema';
import { auditedInsert, auditedUpdate, auditedDelete } from './audited';
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
	return auditedInsert(actorId, utilityAccounts, 'utility_account', toRow(input));
}

export async function updateAccount(actorId: string, id: string, input: UtilityAccountInput) {
	return auditedUpdate(
		actorId,
		utilityAccounts,
		utilityAccounts.id,
		'utility_account',
		id,
		toRow(input)
	);
}

export async function deleteAccount(actorId: string, id: string): Promise<boolean> {
	return auditedDelete(
		actorId,
		utilityAccounts,
		utilityAccounts.id,
		'utility_account',
		id,
		(deleted) => ({
			accountNumber: { from: deleted.accountNumber, to: null }
		})
	);
}

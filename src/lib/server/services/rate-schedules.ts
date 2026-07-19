import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { rateSchedules, utilityProviders, type RateSchedule } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { RateScheduleInput } from '$lib/schemas/utility';

export type RateScheduleWithProvider = RateSchedule & { providerName: string | null };

function toRow(input: RateScheduleInput) {
	return {
		providerId: input.providerId,
		name: input.name,
		utilityType: input.utilityType,
		rateType: input.rateType,
		energyRate: input.energyRate !== undefined ? String(input.energyRate) : null,
		demandRate: input.demandRate !== undefined ? String(input.demandRate) : null,
		fixedMonthlyCharge:
			input.fixedMonthlyCharge !== undefined ? String(input.fixedMonthlyCharge) : null,
		unit: input.unit ?? null,
		effectiveDate: input.effectiveDate ?? null,
		endDate: input.endDate ?? null,
		notes: input.notes ?? null
	};
}

export async function listRateSchedules(
	filters: { providerId?: string; utilityType?: RateSchedule['utilityType'] } = {}
): Promise<RateScheduleWithProvider[]> {
	const conditions: SQL[] = [];
	if (filters.providerId) conditions.push(eq(rateSchedules.providerId, filters.providerId));
	if (filters.utilityType) conditions.push(eq(rateSchedules.utilityType, filters.utilityType));

	const rows = await db
		.select({ schedule: rateSchedules, providerName: utilityProviders.name })
		.from(rateSchedules)
		.leftJoin(utilityProviders, eq(rateSchedules.providerId, utilityProviders.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(rateSchedules.name));

	return rows.map((r) => ({ ...r.schedule, providerName: r.providerName }));
}

export async function getRateSchedule(id: string): Promise<RateSchedule | undefined> {
	return db.query.rateSchedules.findFirst({ where: eq(rateSchedules.id, id) });
}

export async function createRateSchedule(actorId: string, input: RateScheduleInput) {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(rateSchedules).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'rate_schedule',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateRateSchedule(actorId: string, id: string, input: RateScheduleInput) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(rateSchedules).where(eq(rateSchedules.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(rateSchedules)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(rateSchedules.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'rate_schedule',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteRateSchedule(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(rateSchedules).where(eq(rateSchedules.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'rate_schedule',
			entityId: id,
			action: 'delete',
			changes: { name: { from: deleted.name, to: null } }
		});
		return true;
	});
}

import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { meters, buildings, utilityAccounts, type Meter } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { MeterInput } from '$lib/schemas/utility';

export type MeterWithRefs = Meter & {
	buildingName: string | null;
	accountNumber: string | null;
};

function toRow(input: MeterInput) {
	return {
		buildingId: input.buildingId,
		accountId: input.accountId ?? null,
		meterNumber: input.meterNumber,
		utilityType: input.utilityType,
		unit: input.unit,
		status: input.status,
		isSubmeter: input.isSubmeter,
		multiplier: input.multiplier !== undefined ? String(input.multiplier) : null,
		installDate: input.installDate ?? null,
		location: input.location ?? null,
		notes: input.notes ?? null
	};
}

export async function listMeters(
	filters: {
		buildingId?: string;
		utilityType?: Meter['utilityType'];
		status?: Meter['status'];
	} = {}
): Promise<MeterWithRefs[]> {
	const conditions: SQL[] = [];
	if (filters.buildingId) conditions.push(eq(meters.buildingId, filters.buildingId));
	if (filters.utilityType) conditions.push(eq(meters.utilityType, filters.utilityType));
	if (filters.status) conditions.push(eq(meters.status, filters.status));

	const rows = await db
		.select({
			meter: meters,
			buildingName: buildings.name,
			accountNumber: utilityAccounts.accountNumber
		})
		.from(meters)
		.leftJoin(buildings, eq(meters.buildingId, buildings.id))
		.leftJoin(utilityAccounts, eq(meters.accountId, utilityAccounts.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(meters.meterNumber));

	return rows.map((r) => ({
		...r.meter,
		buildingName: r.buildingName,
		accountNumber: r.accountNumber
	}));
}

export async function getMeter(id: string): Promise<Meter | undefined> {
	return db.query.meters.findFirst({ where: eq(meters.id, id) });
}

export async function createMeter(actorId: string, input: MeterInput) {
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(meters).values(toRow(input)).returning();
		await recordAudit(tx, {
			actorId,
			entity: 'meter',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, toRow(input))
		});
		return created;
	});
}

export async function updateMeter(actorId: string, id: string, input: MeterInput) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(meters).where(eq(meters.id, id));
		if (!before) return undefined;
		const row = toRow(input);
		const [updated] = await tx
			.update(meters)
			.set({ ...row, updatedAt: new Date() })
			.where(eq(meters.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'meter',
			entityId: id,
			action: 'update',
			changes: diffRecords(before, row)
		});
		return updated;
	});
}

export async function deleteMeter(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(meters).where(eq(meters.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'meter',
			entityId: id,
			action: 'delete',
			changes: { meterNumber: { from: deleted.meterNumber, to: null } }
		});
		return true;
	});
}

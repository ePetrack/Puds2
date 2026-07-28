import { and, asc, eq, ne, type SQL } from 'drizzle-orm';
import { alias, type PgTransaction } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { meters, buildings, complexes, utilityAccounts, type Meter } from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import type { MeterInput } from '$lib/schemas/utility';

export type MeterWithRefs = Meter & {
	buildingName: string | null;
	complexName: string | null;
	/** Human label for the premise (building or complex). */
	premiseName: string | null;
	accountNumber: string | null;
	parentMeterNumber: string | null;
};

/**
 * Raised when a meter fails a hierarchy rule that Zod can't express on its own
 * (premise, parent utility-type match, self-reference, cycle). Routes translate
 * `field`/`message` into a form field error.
 */
export class MeterValidationError extends Error {
	field: string;
	constructor(field: string, message: string) {
		super(message);
		this.name = 'MeterValidationError';
		this.field = field;
	}
}

function toRow(input: MeterInput) {
	return {
		buildingId: input.buildingId ?? null,
		complexId: input.complexId ?? null,
		parentMeterId: input.parentMeterId ?? null,
		// A submeter is any meter fed by a parent meter.
		isSubmeter: input.parentMeterId != null,
		accountId: input.accountId ?? null,
		meterNumber: input.meterNumber,
		utilityType: input.utilityType,
		unit: input.unit,
		status: input.status,
		ownership: input.ownership ?? 'unknown',
		multiplier: input.multiplier !== undefined ? String(input.multiplier) : null,
		installDate: input.installDate ?? null,
		location: input.location ?? null,
		notes: input.notes ?? null
	};
}

const parentMeter = alias(meters, 'parent_meter');

function withRefs(r: {
	meter: Meter;
	buildingName: string | null;
	complexName: string | null;
	accountNumber: string | null;
	parentMeterNumber: string | null;
}): MeterWithRefs {
	return {
		...r.meter,
		buildingName: r.buildingName,
		complexName: r.complexName,
		premiseName: r.buildingName ?? r.complexName,
		accountNumber: r.accountNumber,
		parentMeterNumber: r.parentMeterNumber
	};
}

const meterSelect = {
	meter: meters,
	buildingName: buildings.name,
	complexName: complexes.name,
	accountNumber: utilityAccounts.accountNumber,
	parentMeterNumber: parentMeter.meterNumber
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = PgTransaction<any, any, any>;

/**
 * Enforce hierarchy invariants a meter must satisfy before it is written.
 * `selfId` is the meter's own id on update (undefined on create).
 */
async function assertValidMeter(tx: Tx, input: MeterInput, selfId?: string): Promise<void> {
	// Premise: exactly one of building or complex (belt-and-suspenders with the DB check).
	const premiseCount = (input.buildingId ? 1 : 0) + (input.complexId ? 1 : 0);
	if (premiseCount !== 1) {
		throw new MeterValidationError(
			'buildingId',
			'Select exactly one premise: a building or a complex'
		);
	}

	if (input.parentMeterId) {
		if (input.parentMeterId === selfId) {
			throw new MeterValidationError('parentMeterId', 'A meter cannot be its own parent');
		}
		const [parent] = await tx.select().from(meters).where(eq(meters.id, input.parentMeterId));
		if (!parent) {
			throw new MeterValidationError('parentMeterId', 'Parent meter not found');
		}
		if (parent.utilityType !== input.utilityType) {
			throw new MeterValidationError(
				'parentMeterId',
				'A submeter must have the same utility type as its parent'
			);
		}
		// Walk the parent chain; reaching selfId would form a cycle.
		if (selfId) {
			let cursor: string | null = parent.parentMeterId;
			while (cursor) {
				if (cursor === selfId) {
					throw new MeterValidationError('parentMeterId', 'That parent would create a meter loop');
				}
				const [next]: { parentMeterId: string | null }[] = await tx
					.select({ parentMeterId: meters.parentMeterId })
					.from(meters)
					.where(eq(meters.id, cursor));
				cursor = next?.parentMeterId ?? null;
			}
		}
	}
}

export async function listMeters(
	filters: {
		buildingId?: string;
		complexId?: string;
		parentMeterId?: string;
		utilityType?: Meter['utilityType'];
		status?: Meter['status'];
	} = {}
): Promise<MeterWithRefs[]> {
	const conditions: SQL[] = [];
	if (filters.buildingId) conditions.push(eq(meters.buildingId, filters.buildingId));
	if (filters.complexId) conditions.push(eq(meters.complexId, filters.complexId));
	if (filters.parentMeterId) conditions.push(eq(meters.parentMeterId, filters.parentMeterId));
	if (filters.utilityType) conditions.push(eq(meters.utilityType, filters.utilityType));
	if (filters.status) conditions.push(eq(meters.status, filters.status));

	const rows = await db
		.select(meterSelect)
		.from(meters)
		.leftJoin(buildings, eq(meters.buildingId, buildings.id))
		.leftJoin(complexes, eq(meters.complexId, complexes.id))
		.leftJoin(utilityAccounts, eq(meters.accountId, utilityAccounts.id))
		.leftJoin(parentMeter, eq(meters.parentMeterId, parentMeter.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(meters.meterNumber));

	return rows.map(withRefs);
}

/** Direct child submeters of a meter. */
export async function listSubmeters(parentId: string): Promise<MeterWithRefs[]> {
	return listMeters({ parentMeterId: parentId });
}

export async function getMeter(id: string): Promise<Meter | undefined> {
	return db.query.meters.findFirst({ where: eq(meters.id, id) });
}

/** All meters as options for a parent-meter select; the form filters by utility type. */
export async function listMeterOptions(): Promise<
	{ id: string; meterNumber: string; utilityType: Meter['utilityType'] }[]
> {
	return db
		.select({ id: meters.id, meterNumber: meters.meterNumber, utilityType: meters.utilityType })
		.from(meters)
		.orderBy(asc(meters.meterNumber));
}

/**
 * Meters eligible to be a parent: same utility type, excluding the meter itself
 * and any of its descendants (which would form a cycle).
 */
export async function listParentCandidates(
	utilityType: Meter['utilityType'],
	excludeId?: string
): Promise<{ id: string; meterNumber: string }[]> {
	const rows = await db
		.select({ id: meters.id, meterNumber: meters.meterNumber, parentMeterId: meters.parentMeterId })
		.from(meters)
		.where(
			excludeId
				? and(eq(meters.utilityType, utilityType), ne(meters.id, excludeId))
				: eq(meters.utilityType, utilityType)
		)
		.orderBy(asc(meters.meterNumber));

	if (!excludeId) return rows.map((r) => ({ id: r.id, meterNumber: r.meterNumber }));

	// Exclude descendants of excludeId so the UI can't offer a cycle-forming parent.
	const childrenOf = new Map<string, string[]>();
	for (const r of rows) {
		if (r.parentMeterId) {
			const list = childrenOf.get(r.parentMeterId) ?? [];
			list.push(r.id);
			childrenOf.set(r.parentMeterId, list);
		}
	}
	const banned = new Set<string>([excludeId]);
	const queue = [excludeId];
	while (queue.length) {
		const id = queue.shift()!;
		for (const child of childrenOf.get(id) ?? []) {
			if (!banned.has(child)) {
				banned.add(child);
				queue.push(child);
			}
		}
	}

	return rows
		.filter((r) => !banned.has(r.id))
		.map((r) => ({ id: r.id, meterNumber: r.meterNumber }));
}

export async function createMeter(actorId: string, input: MeterInput) {
	return db.transaction(async (tx) => {
		await assertValidMeter(tx, input);
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
		await assertValidMeter(tx, input, id);
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

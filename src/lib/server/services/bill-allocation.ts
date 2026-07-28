import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import {
	billAllocations,
	billAllocationLines,
	utilityBills,
	meters,
	buildings,
	energyReadings,
	type BillAllocation,
	type BillAllocationLine
} from '../db/schema';
import { recordAudit, diffRecords } from './audit';
import { normalizeBuildings, type NormalizationResult } from './weather-normalization';
import {
	allocateBill,
	AllocationError,
	type AllocationMethod,
	type AllocationResult,
	type AllocationTarget
} from './bill-allocation-math';

export { AllocationError } from './bill-allocation-math';
export type { AllocationMethod, AllocationResult } from './bill-allocation-math';

export type AllocationWithLines = BillAllocation & { lines: BillAllocationLine[] };

const num = (v: string | null | undefined) => (v == null ? undefined : Number(v));

/**
 * Build the allocation targets for a bill.
 *
 * A bill's meter identifies the premise. When that premise is a complex, the targets
 * are the buildings the complex serves; submetered usage comes from readings on the
 * submeters beneath the master over the bill period.
 */
export async function buildTargets(
	billId: string
): Promise<{ targets: AllocationTarget[]; warnings: string[] }> {
	const [bill] = await db.select().from(utilityBills).where(eq(utilityBills.id, billId));
	if (!bill) throw new AllocationError('billId', 'Bill not found');

	const warnings: string[] = [];
	let complexId: string | null = null;
	let masterMeterId: string | null = null;

	if (bill.meterId) {
		const [m] = await db.select().from(meters).where(eq(meters.id, bill.meterId));
		if (m) {
			complexId = m.complexId;
			masterMeterId = m.id;
		}
	}

	if (!complexId) {
		throw new AllocationError(
			'meterId',
			'This bill is not attached to a complex master meter, so there is nothing to split across buildings'
		);
	}

	const served = await db
		.select()
		.from(buildings)
		.where(eq(buildings.complexId, complexId))
		.orderBy(asc(buildings.name));

	if (served.length === 0) {
		throw new AllocationError('complexId', 'No buildings belong to this complex yet');
	}

	// Submeter usage over the bill period, keyed by the building the submeter sits on.
	const usageByBuilding = new Map<string, number>();
	if (masterMeterId) {
		const rows = await db
			.select({
				buildingId: meters.buildingId,
				total: sql<string>`sum(${energyReadings.usage})`
			})
			.from(energyReadings)
			.innerJoin(meters, eq(energyReadings.meterId, meters.id))
			.where(
				and(
					eq(meters.parentMeterId, masterMeterId),
					gte(energyReadings.readingDate, bill.periodStart),
					lte(energyReadings.readingDate, bill.periodEnd)
				)
			)
			.groupBy(meters.buildingId);

		for (const r of rows) {
			if (r.buildingId) usageByBuilding.set(r.buildingId, Number(r.total));
		}

		if (rows.length === 0) {
			warnings.push(
				'No submeter readings fall inside this bill period — submetered allocation is unavailable; ' +
					'check that reading dates align with the billing period'
			);
		}
	}

	const targets: AllocationTarget[] = served.map((b) => ({
		buildingId: b.id,
		label: b.name,
		submeteredUsage: usageByBuilding.get(b.id) ?? 0,
		squareFootage: b.squareFootage,
		occupancy: b.occupancy
	}));

	return { targets, warnings };
}

export interface AllocationContext {
	available: boolean;
	/** Why allocation isn't offered, when it isn't. */
	reason?: string;
	targets: AllocationTarget[];
	warnings: string[];
}

/**
 * What the bill detail page needs to decide whether to offer allocation at all, without
 * the caller having to catch `AllocationError` just to render a disabled panel.
 */
export async function allocationContext(billId: string): Promise<AllocationContext> {
	try {
		const { targets, warnings } = await buildTargets(billId);
		return { available: true, targets, warnings };
	} catch (err) {
		if (err instanceof AllocationError) {
			return { available: false, reason: err.message, targets: [], warnings: [] };
		}
		throw err;
	}
}

/** Compute an allocation without saving — used to preview before committing. */
export async function previewAllocation(
	billId: string,
	method: AllocationMethod,
	fixedPct?: Record<string, number>
): Promise<AllocationResult> {
	const [bill] = await db.select().from(utilityBills).where(eq(utilityBills.id, billId));
	if (!bill) throw new AllocationError('billId', 'Bill not found');

	const { targets, warnings } = await buildTargets(billId);
	if (fixedPct) {
		for (const t of targets) t.fixedPct = fixedPct[t.buildingId] ?? 0;
	}

	// Weather normalisation needs the database, so it happens here and the pure calculator
	// just receives the expected usage per building.
	let normalization: NormalizationResult | undefined;
	let effectiveMethod = method;
	if (method === 'weather_normalized') {
		normalization = await normalizeBuildings(
			targets.map((t) => t.buildingId),
			bill.periodStart,
			bill.periodEnd
		);
		const expected = new Map(normalization.buildings.map((b) => [b.buildingId, b.expectedUsage]));
		for (const t of targets) t.normalizedUsage = expected.get(t.buildingId) ?? 0;
		warnings.push(...normalization.warnings);

		// Falling back rather than failing: an un-normalised split is still defensible, a
		// silently-partial one is not. The substitution is stated in the warnings and the
		// saved basis, so a reviewer can see the allocation is not what was asked for.
		if (targets.every((t) => !t.normalizedUsage)) {
			effectiveMethod = 'area';
			warnings.push(
				'No building could be weather-normalised, so this bill was split by square footage instead'
			);
		}
	}

	const result = allocateBill(effectiveMethod, targets, {
		usage: num(bill.usage),
		demandKw: num(bill.demandKw),
		energyCharge: num(bill.energyCharge),
		demandCharge: num(bill.demandCharge),
		fixedCharge: num(bill.fixedCharge),
		otherCharges: (num(bill.otherCharges) ?? 0) + (num(bill.taxesFees) ?? 0),
		totalCost: Number(bill.totalCost)
	});

	result.warnings = [...warnings, ...result.warnings];
	if (normalization) {
		// The weather series, the fitted coefficients and the fit statistics all belong in the
		// snapshot: without them the number cannot be reproduced or challenged later.
		result.basis = {
			...result.basis,
			requestedMethod: method,
			appliedMethod: effectiveMethod,
			weather: {
				station: normalization.station,
				baseTempF: normalization.baseTempF,
				periodHdd: normalization.periodHdd,
				periodCdd: normalization.periodCdd,
				buildings: normalization.buildings
			}
		};
	}
	return result;
}

/** Persist an allocation, replacing any previous one for the bill. */
export async function saveAllocation(
	actorId: string,
	billId: string,
	method: AllocationMethod,
	notes?: string,
	fixedPct?: Record<string, number>
): Promise<AllocationWithLines> {
	const result = await previewAllocation(billId, method, fixedPct);

	return db.transaction(async (tx) => {
		await tx.delete(billAllocations).where(eq(billAllocations.billId, billId));

		const [created] = await tx
			.insert(billAllocations)
			.values({
				billId,
				method,
				basis: result.basis,
				warnings: result.warnings,
				notes: notes ?? null,
				createdBy: actorId
			})
			.returning();

		const lines = await tx
			.insert(billAllocationLines)
			.values(
				result.lines.map((l) => ({
					allocationId: created.id,
					buildingId: l.buildingId,
					label: l.label,
					basisValue: l.basisValue != null ? String(l.basisValue) : null,
					sharePct: String(l.sharePct),
					usage: String(l.usage),
					demandKw: String(l.demandKw),
					energyCost: String(l.energyCost),
					demandCost: String(l.demandCost),
					fixedCost: String(l.fixedCost),
					totalCost: String(l.totalCost),
					isRemainder: l.isRemainder
				}))
			)
			.returning();

		await recordAudit(tx, {
			actorId,
			entity: 'bill_allocation',
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, { billId, method, lines: result.lines.length })
		});

		return { ...created, lines };
	});
}

export async function getAllocation(billId: string): Promise<AllocationWithLines | undefined> {
	const [alloc] = await db
		.select()
		.from(billAllocations)
		.where(eq(billAllocations.billId, billId))
		.orderBy(desc(billAllocations.createdAt))
		.limit(1);
	if (!alloc) return undefined;

	const lines = await db
		.select()
		.from(billAllocationLines)
		.where(eq(billAllocationLines.allocationId, alloc.id))
		.orderBy(asc(billAllocationLines.isRemainder), desc(billAllocationLines.sharePct));

	return { ...alloc, lines };
}

export async function deleteAllocation(actorId: string, billId: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx
			.delete(billAllocations)
			.where(eq(billAllocations.billId, billId))
			.returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'bill_allocation',
			entityId: deleted.id,
			action: 'delete',
			changes: { method: { from: deleted.method, to: null } }
		});
		return true;
	});
}

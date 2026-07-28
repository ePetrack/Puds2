import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { meters, buildings, complexes, energyReadings, type Meter } from '../db/schema';
import {
	reconcilePeriods,
	type PeriodUsage,
	type ReconciliationResult,
	type SubmeterPeriodUsage
} from './reconciliation-math';

export * from './reconciliation-math';

export interface ReconcilableMeter {
	id: string;
	meterNumber: string;
	utilityType: Meter['utilityType'];
	unit: Meter['unit'];
	premiseName: string | null;
	submeterCount: number;
}

/**
 * Meters worth reconciling: those with at least one submeter beneath them. A master with
 * no children has nothing to compare against, so offering it would only produce an empty
 * report.
 */
export async function listReconcilableMeters(): Promise<ReconcilableMeter[]> {
	const rows = await db
		.select({
			id: meters.id,
			meterNumber: meters.meterNumber,
			utilityType: meters.utilityType,
			unit: meters.unit,
			buildingName: buildings.name,
			complexName: complexes.name,
			parentMeterId: meters.parentMeterId
		})
		.from(meters)
		.leftJoin(buildings, eq(meters.buildingId, buildings.id))
		.leftJoin(complexes, eq(meters.complexId, complexes.id))
		.orderBy(asc(meters.meterNumber));

	const childCounts = new Map<string, number>();
	for (const r of rows) {
		if (r.parentMeterId)
			childCounts.set(r.parentMeterId, (childCounts.get(r.parentMeterId) ?? 0) + 1);
	}

	return rows
		.filter((r) => childCounts.has(r.id))
		.map((r) => ({
			id: r.id,
			meterNumber: r.meterNumber,
			utilityType: r.utilityType,
			unit: r.unit,
			premiseName: r.buildingName ?? r.complexName,
			submeterCount: childCounts.get(r.id) ?? 0
		}));
}

export interface MeterReconciliation extends ReconciliationResult {
	meter: ReconcilableMeter;
	submeters: { id: string; meterNumber: string; premiseName: string | null }[];
}

/**
 * Reconcile one master meter against its direct submeters over the trailing `monthsBack`
 * months, bucketed by calendar month.
 *
 * Only **direct** children are summed. Walking the whole subtree would double-count any
 * meter that is itself submetered, which is exactly the `over_metered` signal this report
 * exists to surface — so the depth limit is a correctness rule, not a simplification.
 */
export async function reconcileMeter(
	meterId: string,
	monthsBack = 12,
	tolerancePct = 2
): Promise<MeterReconciliation | undefined> {
	const candidates = await listReconcilableMeters();
	const meter = candidates.find((m) => m.id === meterId);
	if (!meter) return undefined;

	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - monthsBack);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const [masterRows, submeterRows, children] = await Promise.all([
		db
			.select({
				period: sql<string>`to_char(${energyReadings.readingDate}, 'YYYY-MM')`,
				usage: sql<string>`sum(${energyReadings.usage})`
			})
			.from(energyReadings)
			.where(and(eq(energyReadings.meterId, meterId), gte(energyReadings.readingDate, cutoffStr)))
			.groupBy(sql`to_char(${energyReadings.readingDate}, 'YYYY-MM')`),
		db
			.select({
				period: sql<string>`to_char(${energyReadings.readingDate}, 'YYYY-MM')`,
				meterId: meters.id,
				meterNumber: meters.meterNumber,
				usage: sql<string>`sum(${energyReadings.usage})`
			})
			.from(energyReadings)
			.innerJoin(meters, eq(energyReadings.meterId, meters.id))
			.where(and(eq(meters.parentMeterId, meterId), gte(energyReadings.readingDate, cutoffStr)))
			.groupBy(
				sql`to_char(${energyReadings.readingDate}, 'YYYY-MM')`,
				meters.id,
				meters.meterNumber
			),
		db
			.select({
				id: meters.id,
				meterNumber: meters.meterNumber,
				buildingName: buildings.name,
				complexName: complexes.name
			})
			.from(meters)
			.leftJoin(buildings, eq(meters.buildingId, buildings.id))
			.leftJoin(complexes, eq(meters.complexId, complexes.id))
			.where(eq(meters.parentMeterId, meterId))
			.orderBy(asc(meters.meterNumber))
	]);

	const master: PeriodUsage[] = masterRows.map((r) => ({
		period: r.period,
		usage: Number(r.usage)
	}));
	const submeterUsage: SubmeterPeriodUsage[] = submeterRows.map((r) => ({
		period: r.period,
		meterId: r.meterId,
		meterNumber: r.meterNumber,
		usage: Number(r.usage)
	}));

	return {
		...reconcilePeriods(master, submeterUsage, tolerancePct),
		meter,
		submeters: children.map((c) => ({
			id: c.id,
			meterNumber: c.meterNumber,
			premiseName: c.buildingName ?? c.complexName
		}))
	};
}

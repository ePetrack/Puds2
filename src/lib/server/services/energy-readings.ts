import { and, asc, count, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { energyReadings, meters, buildings, type EnergyReading, type Meter } from '../db/schema';
import { recordAudit } from './audit';
import { parseCSV } from '../csv';
import { energyReadingSchema, type EnergyReadingInput } from '$lib/schemas/energy-reading';
import type { Paginated } from './pagination';

export type ReadingWithRefs = EnergyReading & {
	meterNumber: string | null;
	meterUnit: Meter['unit'] | null;
	utilityType: Meter['utilityType'] | null;
	buildingName: string | null;
	buildingId: string | null;
};

const readingSelect = {
	reading: energyReadings,
	meterNumber: meters.meterNumber,
	meterUnit: meters.unit,
	utilityType: meters.utilityType,
	buildingName: buildings.name,
	buildingId: buildings.id
};

function withRefs(r: {
	reading: EnergyReading;
	meterNumber: string | null;
	meterUnit: Meter['unit'] | null;
	utilityType: Meter['utilityType'] | null;
	buildingName: string | null;
	buildingId: string | null;
}): ReadingWithRefs {
	return {
		...r.reading,
		meterNumber: r.meterNumber,
		meterUnit: r.meterUnit,
		utilityType: r.utilityType,
		buildingName: r.buildingName,
		buildingId: r.buildingId
	};
}

export interface ReadingListParams {
	page?: number;
	perPage?: number;
	meterId?: string;
	buildingId?: string;
}

export async function listReadings(
	params: ReadingListParams = {}
): Promise<Paginated<ReadingWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.meterId) conditions.push(eq(energyReadings.meterId, params.meterId));
	if (params.buildingId) conditions.push(eq(meters.buildingId, params.buildingId));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select(readingSelect)
			.from(energyReadings)
			.leftJoin(meters, eq(energyReadings.meterId, meters.id))
			.leftJoin(buildings, eq(meters.buildingId, buildings.id))
			.where(where)
			.orderBy(desc(energyReadings.readingDate))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db
			.select({ value: count() })
			.from(energyReadings)
			.leftJoin(meters, eq(energyReadings.meterId, meters.id))
			.where(where)
	]);

	return {
		items: rows.map(withRefs),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function createReading(actorId: string, input: EnergyReadingInput) {
	return db.transaction(async (tx) => {
		const [created] = await tx
			.insert(energyReadings)
			.values({
				meterId: input.meterId,
				readingDate: input.readingDate,
				usage: String(input.usage),
				demandKw: input.demandKw !== undefined ? String(input.demandKw) : null,
				cost: input.cost !== undefined ? String(input.cost) : null,
				readingType: input.readingType,
				source: 'manual',
				notes: input.notes ?? null
			})
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'energy_reading',
			entityId: created.id,
			action: 'create',
			changes: {
				meterId: { from: null, to: input.meterId },
				readingDate: { from: null, to: input.readingDate },
				usage: { from: null, to: input.usage }
			}
		});
		return created;
	});
}

export async function deleteReading(actorId: string, id: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await tx.delete(energyReadings).where(eq(energyReadings.id, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity: 'energy_reading',
			entityId: id,
			action: 'delete',
			changes: { readingDate: { from: deleted.readingDate, to: null } }
		});
		return true;
	});
}

// ---------------------------------------------------------------------------
// Monthly aggregation for charts
// ---------------------------------------------------------------------------

export interface MonthlyUsagePoint {
	month: string; // YYYY-MM
	usage: number;
	cost: number | null;
}

/** Monthly usage totals for the trailing 12 months, filtered by meter or building. */
export async function monthlyUsageSeries(
	filters: { meterId?: string; buildingId?: string } = {}
): Promise<MonthlyUsagePoint[]> {
	const cutoff = new Date();
	cutoff.setFullYear(cutoff.getFullYear() - 1);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const conditions: SQL[] = [gte(energyReadings.readingDate, cutoffStr)];
	if (filters.meterId) conditions.push(eq(energyReadings.meterId, filters.meterId));
	if (filters.buildingId) conditions.push(eq(meters.buildingId, filters.buildingId));

	const monthExpr = sql<string>`to_char(${energyReadings.readingDate}, 'YYYY-MM')`;
	const rows = await db
		.select({
			month: monthExpr,
			usage: sql<string>`coalesce(sum(${energyReadings.usage}), 0)`,
			cost: sql<string | null>`sum(${energyReadings.cost})`
		})
		.from(energyReadings)
		.leftJoin(meters, eq(energyReadings.meterId, meters.id))
		.where(and(...conditions))
		.groupBy(monthExpr)
		.orderBy(asc(monthExpr));

	// Fill empty months so charts have a stable 12-bucket x-axis
	const byMonth = new Map(rows.map((r) => [r.month, r]));
	const points: MonthlyUsagePoint[] = [];
	const now = new Date();
	for (let i = 11; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const row = byMonth.get(key);
		points.push({
			month: key,
			usage: row ? Number(row.usage) : 0,
			cost: row?.cost !== null && row?.cost !== undefined ? Number(row.cost) : null
		});
	}
	return points;
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface ReadingImportFailure {
	line: number;
	errors: string[];
}

export interface ReadingImportResult {
	imported: number;
	failures: ReadingImportFailure[];
}

/**
 * Import readings from CSV text, matched to meters by `meter_number`. A reading
 * per meter+date is unique; duplicates are reported and skipped. Valid rows are
 * inserted in one transaction.
 */
export async function importReadingsCSV(
	actorId: string,
	csvText: string
): Promise<ReadingImportResult> {
	const rows = parseCSV(csvText);
	if (rows.length === 0) {
		return { imported: 0, failures: [{ line: 1, errors: ['No data rows found'] }] };
	}

	const allMeters = await db
		.select({ id: meters.id, meterNumber: meters.meterNumber })
		.from(meters);
	const metersByNumber = new Map(allMeters.map((m) => [m.meterNumber, m.id]));

	const failures: ReadingImportFailure[] = [];
	const validRows: EnergyReadingInput[] = [];
	const seenKeys = new Set<string>();

	rows.forEach((row, idx) => {
		const line = idx + 2;
		const meterId = metersByNumber.get(row.meter_number ?? '');
		if (!meterId) {
			failures.push({
				line,
				errors: [
					row.meter_number
						? `No meter found with number "${row.meter_number}"`
						: 'Missing meter_number'
				]
			});
			return;
		}

		const parsed = energyReadingSchema.safeParse({
			meterId,
			readingDate: row.reading_date ?? '',
			usage: row.usage ?? '',
			demandKw: row.demand_kw ?? '',
			cost: row.cost ?? '',
			readingType: row.reading_type?.toLowerCase() ?? '',
			notes: row.notes ?? ''
		});

		if (!parsed.success) {
			failures.push({
				line,
				errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
			});
			return;
		}

		const key = `${meterId}|${parsed.data.readingDate}`;
		if (seenKeys.has(key)) {
			failures.push({ line, errors: ['Duplicate meter + date within this file'] });
			return;
		}
		seenKeys.add(key);
		validRows.push(parsed.data);
	});

	let imported = 0;
	if (validRows.length > 0) {
		await db.transaction(async (tx) => {
			for (const input of validRows) {
				const [created] = await tx
					.insert(energyReadings)
					.values({
						meterId: input.meterId,
						readingDate: input.readingDate,
						usage: String(input.usage),
						demandKw: input.demandKw !== undefined ? String(input.demandKw) : null,
						cost: input.cost !== undefined ? String(input.cost) : null,
						readingType: input.readingType,
						source: 'csv_import'
					})
					.onConflictDoNothing()
					.returning();
				if (created) {
					imported++;
					await recordAudit(tx, {
						actorId,
						entity: 'energy_reading',
						entityId: created.id,
						action: 'create',
						changes: { source: { from: null, to: 'csv_import' } }
					});
				}
			}
		});
	}

	const skippedAsExisting = validRows.length - imported;
	if (skippedAsExisting > 0) {
		failures.push({
			line: 0,
			errors: [
				`${skippedAsExisting} row(s) skipped — a reading already exists for that meter and date`
			]
		});
	}

	return { imported, failures };
}

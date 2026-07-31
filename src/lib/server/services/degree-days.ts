import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { degreeDays, type DegreeDay } from '../db/schema';
import { recordAudit } from './audit';
import { parseCSV } from '../csv';
import { degreeDaySchema, type DegreeDayInput } from '$lib/schemas/degree-days';
import type { Paginated } from './pagination';

/**
 * Degree days back the `weather_normalized` allocation method. They are **stored, never
 * fetched at runtime** — an air-gapped federal or hospital deployment can't call a weather
 * API, and an allocation stops being reproducible the moment its weather inputs are re-read
 * from a service that may have revised them since. That makes an import path the only way
 * weather gets into the system, which is what this module is.
 */

export interface DegreeDayListParams {
	page?: number;
	perPage?: number;
	station?: string;
	from?: string;
	to?: string;
}

export async function listDegreeDays(
	params: DegreeDayListParams = {}
): Promise<Paginated<DegreeDay>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.station) conditions.push(eq(degreeDays.station, params.station));
	if (params.from) conditions.push(gte(degreeDays.period, params.from));
	if (params.to) conditions.push(lte(degreeDays.period, params.to));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [items, [{ value: total }]] = await Promise.all([
		db
			.select()
			.from(degreeDays)
			.where(where)
			.orderBy(desc(degreeDays.period), asc(degreeDays.station))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(degreeDays).where(where)
	]);

	return {
		items,
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export interface StationCoverage {
	station: string;
	baseTempF: number;
	months: number;
	firstPeriod: string;
	lastPeriod: string;
}

/**
 * One row per stored series. `weather_normalized` needs 12 months minimum per building, so
 * showing coverage up front is the difference between a user understanding why the method
 * fell back and being told only that it did.
 */
export async function listStationCoverage(): Promise<StationCoverage[]> {
	const rows = await db
		.select({
			station: degreeDays.station,
			baseTempF: degreeDays.baseTempF,
			months: sql<string>`count(*)`,
			firstPeriod: sql<string>`min(${degreeDays.period})::text`,
			lastPeriod: sql<string>`max(${degreeDays.period})::text`
		})
		.from(degreeDays)
		.groupBy(degreeDays.station, degreeDays.baseTempF)
		.orderBy(sql`count(*) desc`, asc(degreeDays.station));

	return rows.map((r) => ({
		station: r.station,
		baseTempF: Number(r.baseTempF),
		months: Number(r.months),
		firstPeriod: r.firstPeriod,
		lastPeriod: r.lastPeriod
	}));
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface DegreeDayImportFailure {
	line: number;
	errors: string[];
}

export interface DegreeDayImportResult {
	/** Rows that created a new month of weather. */
	inserted: number;
	/** Rows that replaced an existing month — a revised series, not a duplicate. */
	updated: number;
	failures: DegreeDayImportFailure[];
	notices: string[];
	series: { station: string; baseTempF: number; firstPeriod: string; lastPeriod: string }[];
}

/** NOAA and most utility-supplied series are published at a 65°F base. */
const CONVENTIONAL_BASE_TEMP_F = 65;

const seriesKey = (station: string, baseTempF: number) => `${station}|${baseTempF}`;

/**
 * Import a degree-day series from CSV.
 *
 * Rows **upsert** on `(station, period, base_temp_f)`. Weather series get revised by their
 * source, so re-importing a corrected file has to replace the affected months; an
 * insert-only importer would either reject the whole file or silently double the heating
 * load for every month it already had.
 *
 * The whole file is validated before anything is written, and the write is one transaction,
 * so a file with a bad row halfway through doesn't leave a half-updated series behind.
 */
export async function importDegreeDaysCSV(
	actorId: string,
	csvText: string
): Promise<DegreeDayImportResult> {
	const empty = (extra: Partial<DegreeDayImportResult> = {}): DegreeDayImportResult => ({
		inserted: 0,
		updated: 0,
		failures: [],
		notices: [],
		series: [],
		...extra
	});

	const rows = parseCSV(csvText);
	if (rows.length === 0) {
		return empty({ failures: [{ line: 1, errors: ['No data rows found'] }] });
	}

	const notices: string[] = [];
	// An absent column is a documented assumption; a present-but-blank cell is an error. The
	// difference matters — silently assuming a balance point per row would let two different
	// series merge into one.
	const hasBaseTempColumn = Object.prototype.hasOwnProperty.call(rows[0], 'base_temp_f');
	if (!hasBaseTempColumn) {
		notices.push(
			`No base_temp_f column — assumed ${CONVENTIONAL_BASE_TEMP_F}°F, the conventional base for published degree days`
		);
	}

	const failures: DegreeDayImportFailure[] = [];
	const valid: DegreeDayInput[] = [];
	const seen = new Map<string, number>();

	rows.forEach((row, idx) => {
		const line = idx + 2;
		const parsed = degreeDaySchema.safeParse({
			station: row.station ?? '',
			period: row.period ?? row.month ?? '',
			baseTempF: hasBaseTempColumn ? (row.base_temp_f ?? '') : CONVENTIONAL_BASE_TEMP_F,
			hdd: row.hdd ?? '',
			cdd: row.cdd ?? '',
			source: row.source ?? ''
		});

		if (!parsed.success) {
			failures.push({
				line,
				errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
			});
			return;
		}

		const key = `${seriesKey(parsed.data.station, parsed.data.baseTempF)}|${parsed.data.period}`;
		const firstSeenAt = seen.get(key);
		if (firstSeenAt !== undefined) {
			// Two rows for the same month would make the result depend on write order.
			failures.push({
				line,
				errors: [`Same station, month and base temperature already appears on line ${firstSeenAt}`]
			});
			return;
		}
		seen.set(key, line);
		valid.push(parsed.data);
	});

	if (valid.length === 0) return empty({ failures, notices });

	// Classify before writing, so the result can distinguish a new series from a revision.
	const existing = await db
		.select({
			station: degreeDays.station,
			period: degreeDays.period,
			baseTempF: degreeDays.baseTempF
		})
		.from(degreeDays);
	const existingKeys = new Set(
		existing.map((e) => `${seriesKey(e.station, Number(e.baseTempF))}|${e.period}`)
	);

	let inserted = 0;
	let updated = 0;
	for (const row of valid) {
		const key = `${seriesKey(row.station, row.baseTempF)}|${row.period}`;
		if (existingKeys.has(key)) updated++;
		else inserted++;
	}

	const bySeries = new Map<string, { station: string; baseTempF: number; periods: string[] }>();
	for (const row of valid) {
		const key = seriesKey(row.station, row.baseTempF);
		const entry = bySeries.get(key) ?? {
			station: row.station,
			baseTempF: row.baseTempF,
			periods: []
		};
		entry.periods.push(row.period);
		bySeries.set(key, entry);
	}
	const series = [...bySeries.values()].map((s) => ({
		station: s.station,
		baseTempF: s.baseTempF,
		firstPeriod: s.periods.reduce((a, b) => (a < b ? a : b)),
		lastPeriod: s.periods.reduce((a, b) => (a > b ? a : b))
	}));

	await db.transaction(async (tx) => {
		await tx
			.insert(degreeDays)
			.values(
				valid.map((row) => ({
					station: row.station,
					period: row.period,
					baseTempF: String(row.baseTempF),
					hdd: String(row.hdd),
					cdd: String(row.cdd),
					source: row.source ?? 'csv_import'
				}))
			)
			.onConflictDoUpdate({
				target: [degreeDays.station, degreeDays.period, degreeDays.baseTempF],
				set: {
					hdd: sql`excluded.hdd`,
					cdd: sql`excluded.cdd`,
					source: sql`excluded.source`,
					updatedAt: sql`now()`
				}
			});

		// One audit row for the run, not one per month. Twenty-four rows of weather recorded as
		// twenty-four audit entries buries the fact that matters — that someone replaced a
		// series, when, and over which span.
		await recordAudit(tx, {
			actorId,
			entity: 'degree_days',
			entityId: series.map((s) => `${s.station}@${s.baseTempF}`).join(','),
			action: existingKeys.size > 0 && updated > 0 ? 'update' : 'create',
			changes: {
				import: {
					from: null,
					to: { rows: valid.length, inserted, updated, rejected: failures.length, series }
				}
			}
		});
	});

	return { inserted, updated, failures, notices, series };
}

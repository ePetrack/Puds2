import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { degreeDays, energyReadings, meters } from '../db/schema';
import {
	fitLinear,
	predict,
	MIN_BASELINE_POINTS,
	type RegressionFit,
	type RegressionPoint
} from './regression';

/**
 * Weather-normalising a building's expected consumption, for `weather_normalized`
 * allocation.
 *
 * Splitting a shared bill by floor area assumes every building responds to weather the
 * same way. They don't: a 1970s single-glazed lab and a recent airtight office in the same
 * complex have very different heating slopes, so in a cold month the area split
 * systematically overcharges the efficient building for the inefficient one's heat. IPMVP
 * calls the fix a routine adjustment — model each building against degree days and split on
 * what each *should* have used under the weather that actually occurred.
 *
 * Two rules keep this honest:
 *
 *  1. **A model that doesn't fit isn't used.** Fewer than 12 months of history, no matching
 *     degree days, or ASHRAE Guideline 14 statistics outside threshold, and the building
 *     gets no normalised basis. The caller falls back and says so.
 *  2. **Everything the model saw is recorded**, so the allocation stays reproducible after
 *     the weather series or the readings change underneath it.
 */

export interface BuildingNormalization {
	buildingId: string;
	/** Expected usage for the bill period, or null when no usable model could be fitted. */
	expectedUsage: number | null;
	reason?: string;
	fit?: {
		intercept: number;
		hddCoefficient: number;
		cddCoefficient: number;
		months: number;
		rSquared: number;
		cvRmse: number;
		nmbe: number;
	};
}

export interface NormalizationResult {
	station: string | null;
	baseTempF: number | null;
	/** Degree days over the bill period itself — what the model is asked to predict from. */
	periodHdd: number | null;
	periodCdd: number | null;
	buildings: BuildingNormalization[];
	warnings: string[];
}

const monthKey = (d: string) => d.slice(0, 7);

function describeFit(fit: RegressionFit) {
	return {
		intercept: Math.round(fit.intercept * 1000) / 1000,
		hddCoefficient: Math.round((fit.coefficients[0] ?? 0) * 1e6) / 1e6,
		cddCoefficient: Math.round((fit.coefficients[1] ?? 0) * 1e6) / 1e6,
		months: fit.n,
		rSquared: Math.round(fit.rSquared * 1e4) / 1e4,
		cvRmse: Math.round(fit.cvRmse * 100) / 100,
		nmbe: Math.round(fit.nmbe * 100) / 100
	};
}

/**
 * Fit a degree-day model per building and predict the bill period.
 *
 * `baselineMonths` of history are read back from the bill period. Only one weather station
 * is used — whichever has the most coverage — because mixing stations inside a single
 * allocation would make the shares incomparable.
 */
export async function normalizeBuildings(
	buildingIds: string[],
	periodStart: string,
	periodEnd: string,
	baselineMonths = 24
): Promise<NormalizationResult> {
	const warnings: string[] = [];
	if (buildingIds.length === 0) {
		return {
			station: null,
			baseTempF: null,
			periodHdd: null,
			periodCdd: null,
			buildings: [],
			warnings
		};
	}

	const baselineStart = new Date(periodStart);
	baselineStart.setMonth(baselineStart.getMonth() - baselineMonths);
	const baselineStartStr = baselineStart.toISOString().split('T')[0];

	// The station with the most months in range — one series per allocation, never a mix.
	const [best] = await db
		.select({
			station: degreeDays.station,
			baseTempF: degreeDays.baseTempF,
			months: sql<string>`count(*)`
		})
		.from(degreeDays)
		.where(and(gte(degreeDays.period, baselineStartStr), lt(degreeDays.period, periodEnd)))
		.groupBy(degreeDays.station, degreeDays.baseTempF)
		.orderBy(sql`count(*) desc`)
		.limit(1);

	if (!best) {
		warnings.push(
			'No degree-day data covers this period, so no building could be weather-normalised'
		);
		return {
			station: null,
			baseTempF: null,
			periodHdd: null,
			periodCdd: null,
			buildings: buildingIds.map((buildingId) => ({
				buildingId,
				expectedUsage: null,
				reason: 'No degree-day data'
			})),
			warnings
		};
	}

	const ddRows = await db
		.select()
		.from(degreeDays)
		.where(and(eq(degreeDays.station, best.station), eq(degreeDays.baseTempF, best.baseTempF)))
		.orderBy(asc(degreeDays.period));

	const ddByMonth = new Map(
		ddRows.map((r) => [monthKey(r.period), { hdd: Number(r.hdd), cdd: Number(r.cdd) }])
	);

	// Degree days across the months the bill actually spans.
	let periodHdd = 0;
	let periodCdd = 0;
	let periodMonths = 0;
	for (const [month, dd] of ddByMonth) {
		if (month >= monthKey(periodStart) && month <= monthKey(periodEnd)) {
			periodHdd += dd.hdd;
			periodCdd += dd.cdd;
			periodMonths++;
		}
	}
	if (periodMonths === 0) {
		warnings.push(
			`Degree days from ${best.station} do not cover the bill period, so nothing could be normalised`
		);
		return {
			station: best.station,
			baseTempF: Number(best.baseTempF),
			periodHdd: null,
			periodCdd: null,
			buildings: buildingIds.map((buildingId) => ({
				buildingId,
				expectedUsage: null,
				reason: 'Degree days do not cover the bill period'
			})),
			warnings
		};
	}

	// Monthly usage per building, from every meter on it.
	const usageRows = await db
		.select({
			buildingId: meters.buildingId,
			month: sql<string>`to_char(${energyReadings.readingDate}, 'YYYY-MM')`,
			usage: sql<string>`sum(${energyReadings.usage})`
		})
		.from(energyReadings)
		.innerJoin(meters, eq(energyReadings.meterId, meters.id))
		.where(
			and(
				gte(energyReadings.readingDate, baselineStartStr),
				lt(energyReadings.readingDate, periodStart),
				inArray(meters.buildingId, buildingIds)
			)
		)
		.groupBy(meters.buildingId, sql`to_char(${energyReadings.readingDate}, 'YYYY-MM')`);

	const byBuilding = new Map<string, RegressionPoint[]>();
	for (const row of usageRows) {
		if (!row.buildingId) continue;
		const dd = ddByMonth.get(row.month);
		if (!dd) continue; // A month with usage but no weather can't inform the model.
		const points = byBuilding.get(row.buildingId) ?? [];
		points.push({ x: [dd.hdd, dd.cdd], y: Number(row.usage) });
		byBuilding.set(row.buildingId, points);
	}

	const results: BuildingNormalization[] = buildingIds.map((buildingId) => {
		const points = byBuilding.get(buildingId) ?? [];

		if (points.length < MIN_BASELINE_POINTS) {
			return {
				buildingId,
				expectedUsage: null,
				reason: `Only ${points.length} month${points.length === 1 ? '' : 's'} of readings line up with degree days; ${MIN_BASELINE_POINTS} are needed for an annual baseline`
			};
		}

		const fit = fitLinear(points);
		if (!fit) {
			return {
				buildingId,
				expectedUsage: null,
				reason: 'Readings could not be fitted against degree days (no usable variation)'
			};
		}
		if (!fit.acceptable) {
			// Guideline 14 exists precisely to stop a poor model being used anyway.
			return {
				buildingId,
				expectedUsage: null,
				reason: `Model fit is outside ASHRAE Guideline 14 limits (CV(RMSE) ${fit.cvRmse.toFixed(1)}%, NMBE ${fit.nmbe.toFixed(1)}%)`,
				fit: describeFit(fit)
			};
		}

		return {
			buildingId,
			expectedUsage: Math.round(predict(fit, [periodHdd, periodCdd]) * 1000) / 1000,
			fit: describeFit(fit)
		};
	});

	const unfitted = results.filter((r) => r.expectedUsage === null);
	if (unfitted.length > 0) {
		warnings.push(
			`${unfitted.length} of ${results.length} buildings could not be weather-normalised: ` +
				unfitted.map((r) => r.reason).join('; ')
		);
	}

	return {
		station: best.station,
		baseTempF: Number(best.baseTempF),
		periodHdd: Math.round(periodHdd * 100) / 100,
		periodCdd: Math.round(periodCdd * 100) / 100,
		buildings: results,
		warnings
	};
}

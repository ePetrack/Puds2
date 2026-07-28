/**
 * Master-vs-submeter reconciliation — pure arithmetic, no database access, so it is
 * directly unit-testable (same split as `bill-allocation-math.ts` vs `bill-allocation.ts`).
 *
 * Comparing a master meter against the sum of the submeters beneath it is standard M&V
 * work: the gap is unaccounted energy — common-area load, house load, or distribution
 * loss. Two rules from ISO 50001 and IPMVP shape how it is reported:
 *
 *  1. **Partial coverage is normal, not an error.** Most portfolios submeter some loads
 *     and not others, so a persistent positive gap is the expected state. Reporting it as
 *     a fault trains people to ignore the report. It is surfaced as `unaccounted` and
 *     described in terms of coverage, and only the *opposite* sign — submeters totalling
 *     more than the master — is treated as a defect to chase.
 *  2. **Missing data is not zero.** A period with no master reading yields a null delta
 *     and its own status, never a 100% gap. Silently treating an absent read as zero is
 *     how reconciliation reports end up asserting savings that never happened.
 *
 * A tolerance band absorbs metering noise so small, meaningless deltas don't crowd out the
 * real ones; the default is deliberately conservative.
 */

import type { ReconciliationStatus } from '$lib/schemas/reconciliation';

export type { ReconciliationStatus };

/** Usage for one meter in one period, already bucketed by the caller. */
export interface PeriodUsage {
	period: string;
	usage: number;
}

export interface SubmeterPeriodUsage extends PeriodUsage {
	meterId: string;
	meterNumber: string;
}

export interface ReconciliationPeriod {
	period: string;
	masterUsage: number | null;
	submeterTotal: number;
	/** How many distinct submeters reported in this period. */
	submeterCount: number;
	/** Master minus submeters. Null when there is no master reading to subtract from. */
	delta: number | null;
	/** `delta` as a percentage of the master. Null when the master is absent or zero. */
	deltaPct: number | null;
	status: ReconciliationStatus;
}

export interface ReconciliationSummary {
	periods: number;
	masterTotal: number;
	submeterTotal: number;
	delta: number;
	/** Delta over the whole span, not the mean of per-period percentages. */
	deltaPct: number | null;
	/** Periods where submeters exceeded the master — the actionable ones. */
	overMeteredPeriods: number;
	/** Periods the master didn't report; these are excluded from the totals above. */
	missingMasterPeriods: number;
}

export interface ReconciliationResult {
	periods: ReconciliationPeriod[];
	summary: ReconciliationSummary;
	tolerancePct: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reconcile a master meter against its submeters, period by period.
 *
 * `tolerancePct` is the band inside which a delta counts as balanced — metering accuracy,
 * rounding and small read-date drift all land here. Periods are returned newest first.
 */
export function reconcilePeriods(
	master: PeriodUsage[],
	submeters: SubmeterPeriodUsage[],
	tolerancePct = 2
): ReconciliationResult {
	const masterByPeriod = new Map<string, number>();
	for (const m of master) {
		masterByPeriod.set(m.period, (masterByPeriod.get(m.period) ?? 0) + m.usage);
	}

	const submeterByPeriod = new Map<string, { total: number; meters: Set<string> }>();
	for (const s of submeters) {
		let bucket = submeterByPeriod.get(s.period);
		if (!bucket) {
			bucket = { total: 0, meters: new Set() };
			submeterByPeriod.set(s.period, bucket);
		}
		bucket.total += s.usage;
		bucket.meters.add(s.meterId);
	}

	const allPeriods = [...new Set([...masterByPeriod.keys(), ...submeterByPeriod.keys()])].sort(
		(a, b) => b.localeCompare(a)
	);

	const periods: ReconciliationPeriod[] = allPeriods.map((period) => {
		const masterUsage = masterByPeriod.has(period) ? round3(masterByPeriod.get(period)!) : null;
		const bucket = submeterByPeriod.get(period);
		const submeterTotal = round3(bucket?.total ?? 0);
		const submeterCount = bucket?.meters.size ?? 0;

		if (masterUsage === null) {
			// Nothing to reconcile against — deliberately not reported as a 100% gap.
			return {
				period,
				masterUsage: null,
				submeterTotal,
				submeterCount,
				delta: null,
				deltaPct: null,
				status: 'no_master'
			};
		}

		const delta = round3(masterUsage - submeterTotal);
		const deltaPct = masterUsage > 0 ? round2((delta / masterUsage) * 100) : null;

		let status: ReconciliationStatus;
		if (submeterCount === 0) {
			status = 'no_submeters';
		} else if (deltaPct !== null && Math.abs(deltaPct) <= tolerancePct) {
			status = 'balanced';
		} else if (delta < 0) {
			status = 'over_metered';
		} else {
			status = 'unaccounted';
		}

		return { period, masterUsage, submeterTotal, submeterCount, delta, deltaPct, status };
	});

	// Periods with no master reading are excluded from the totals: including their submeter
	// usage would understate the gap against a master total that never covered them.
	const reconciled = periods.filter((p) => p.masterUsage !== null);
	const masterTotal = round3(reconciled.reduce((a, p) => a + (p.masterUsage ?? 0), 0));
	const submeterTotal = round3(reconciled.reduce((a, p) => a + p.submeterTotal, 0));
	const delta = round3(masterTotal - submeterTotal);

	return {
		periods,
		tolerancePct,
		summary: {
			periods: reconciled.length,
			masterTotal,
			submeterTotal,
			delta,
			deltaPct: masterTotal > 0 ? round2((delta / masterTotal) * 100) : null,
			overMeteredPeriods: periods.filter((p) => p.status === 'over_metered').length,
			missingMasterPeriods: periods.filter((p) => p.status === 'no_master').length
		}
	};
}

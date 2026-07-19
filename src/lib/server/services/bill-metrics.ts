/**
 * Pure bill analytics: derived metrics, charge reconciliation, and anomaly
 * detection against an account's billing history. No I/O — fully unit-testable.
 */

export interface BillLike {
	id: string;
	accountId: string;
	periodStart: string;
	periodEnd: string;
	usage: string | null;
	totalCost: string;
	energyCharge?: string | null;
	demandCharge?: string | null;
	fixedCharge?: string | null;
	taxesFees?: string | null;
	otherCharges?: string | null;
}

/** Variance beyond this fraction of the baseline is flagged as an anomaly. */
export const ANOMALY_THRESHOLD = 0.3;

const num = (v: string | null | undefined): number | null =>
	v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);

/** Days in the service period, inclusive of the end date. */
export function billingPeriodDays(
	bill: Pick<BillLike, 'periodStart' | 'periodEnd'>
): number | null {
	const start = Date.parse(bill.periodStart);
	const end = Date.parse(bill.periodEnd);
	if (isNaN(start) || isNaN(end)) return null;
	const days = Math.round((end - start) / 86_400_000) + 1;
	return days > 0 ? days : null;
}

export interface BillMetrics {
	periodDays: number | null;
	unitCost: number | null;
	dailyCost: number | null;
	dailyUsage: number | null;
}

export function computeBillMetrics(bill: BillLike): BillMetrics {
	const periodDays = billingPeriodDays(bill);
	const usage = num(bill.usage);
	const totalCost = num(bill.totalCost) ?? 0;
	return {
		periodDays,
		unitCost: usage && usage > 0 ? totalCost / usage : null,
		dailyCost: periodDays ? totalCost / periodDays : null,
		dailyUsage: periodDays && usage !== null ? usage / periodDays : null
	};
}

/** Sum of itemized charges, or null when no line items are present. */
export function sumBillCharges(bill: BillLike): number | null {
	const parts = [
		num(bill.energyCharge),
		num(bill.demandCharge),
		num(bill.fixedCharge),
		num(bill.taxesFees),
		num(bill.otherCharges)
	].filter((v): v is number => v !== null);
	if (parts.length === 0) return null;
	return parts.reduce((sum, v) => sum + v, 0);
}

/** True when itemized charges exist but don't add up to the bill total. */
export function hasChargeMismatch(bill: BillLike): boolean {
	const sum = sumBillCharges(bill);
	if (sum === null) return false;
	return Math.abs(sum - (num(bill.totalCost) ?? 0)) > 0.01;
}

export interface BillComparison {
	baselineDailyCost: number;
	baselineDailyUsage: number | null;
	costVariancePct: number | null;
	usageVariancePct: number | null;
	isCostAnomaly: boolean;
	isUsageAnomaly: boolean;
	sampleSize: number;
}

/**
 * Compare a bill's daily cost/usage against the average of the account's prior
 * bills. Daily rates keep uneven billing period lengths from skewing results.
 */
export function compareBillToHistory(bill: BillLike, history: BillLike[]): BillComparison | null {
	const priorMetrics = history
		.filter(
			(b) => b.id !== bill.id && b.accountId === bill.accountId && b.periodEnd < bill.periodStart
		)
		.map((b) => computeBillMetrics(b))
		.filter((m) => m.dailyCost !== null);

	if (priorMetrics.length === 0) return null;

	const baselineDailyCost =
		priorMetrics.reduce((sum, m) => sum + (m.dailyCost ?? 0), 0) / priorMetrics.length;

	const usageMetrics = priorMetrics.filter((m) => m.dailyUsage !== null);
	const baselineDailyUsage =
		usageMetrics.length > 0
			? usageMetrics.reduce((sum, m) => sum + (m.dailyUsage ?? 0), 0) / usageMetrics.length
			: null;

	const current = computeBillMetrics(bill);

	const costVariancePct =
		current.dailyCost !== null && baselineDailyCost > 0
			? (current.dailyCost - baselineDailyCost) / baselineDailyCost
			: null;

	const usageVariancePct =
		current.dailyUsage !== null && baselineDailyUsage !== null && baselineDailyUsage > 0
			? (current.dailyUsage - baselineDailyUsage) / baselineDailyUsage
			: null;

	return {
		baselineDailyCost,
		baselineDailyUsage,
		costVariancePct,
		usageVariancePct,
		isCostAnomaly: costVariancePct !== null && Math.abs(costVariancePct) > ANOMALY_THRESHOLD,
		isUsageAnomaly: usageVariancePct !== null && Math.abs(usageVariancePct) > ANOMALY_THRESHOLD,
		sampleSize: priorMetrics.length
	};
}

import { describe, expect, it } from 'vitest';
import {
	billingPeriodDays,
	computeBillMetrics,
	compareBillToHistory,
	sumBillCharges,
	hasChargeMismatch,
	type BillLike
} from '$lib/server/services/bill-metrics';

function bill(overrides: Partial<BillLike> = {}): BillLike {
	return {
		id: 'b1',
		accountId: 'a1',
		periodStart: '2026-06-01',
		periodEnd: '2026-06-30',
		usage: '30000',
		totalCost: '3000',
		...overrides
	};
}

describe('billingPeriodDays', () => {
	it('is inclusive of the end date', () => {
		expect(billingPeriodDays(bill())).toBe(30);
	});

	it('returns null for invalid or inverted ranges', () => {
		expect(billingPeriodDays(bill({ periodEnd: 'bogus' }))).toBeNull();
		expect(
			billingPeriodDays(bill({ periodStart: '2026-07-01', periodEnd: '2026-06-01' }))
		).toBeNull();
	});
});

describe('computeBillMetrics', () => {
	it('derives unit cost, daily cost, and daily usage', () => {
		const m = computeBillMetrics(bill());
		expect(m.periodDays).toBe(30);
		expect(m.unitCost).toBeCloseTo(0.1);
		expect(m.dailyCost).toBeCloseTo(100);
		expect(m.dailyUsage).toBeCloseTo(1000);
	});

	it('handles missing usage', () => {
		const m = computeBillMetrics(bill({ usage: null }));
		expect(m.unitCost).toBeNull();
		expect(m.dailyUsage).toBeNull();
		expect(m.dailyCost).toBeCloseTo(100);
	});
});

describe('sumBillCharges / hasChargeMismatch', () => {
	it('returns null when no line items are present', () => {
		expect(sumBillCharges(bill())).toBeNull();
		expect(hasChargeMismatch(bill())).toBe(false);
	});

	it('sums present line items', () => {
		const b = bill({ energyCharge: '2000', fixedCharge: '45', taxesFees: '955' });
		expect(sumBillCharges(b)).toBeCloseTo(3000);
		expect(hasChargeMismatch(b)).toBe(false);
	});

	it('flags a mismatch beyond a cent', () => {
		const b = bill({ energyCharge: '2000', fixedCharge: '45' });
		expect(hasChargeMismatch(b)).toBe(true);
	});
});

describe('compareBillToHistory', () => {
	const history: BillLike[] = [
		bill({
			id: 'h1',
			periodStart: '2026-03-01',
			periodEnd: '2026-03-31',
			totalCost: '3100',
			usage: '31000'
		}),
		bill({
			id: 'h2',
			periodStart: '2026-04-01',
			periodEnd: '2026-04-30',
			totalCost: '3000',
			usage: '30000'
		}),
		bill({
			id: 'h3',
			periodStart: '2026-05-01',
			periodEnd: '2026-05-31',
			totalCost: '3100',
			usage: '31000'
		})
	];

	it('returns null with no prior bills', () => {
		expect(compareBillToHistory(bill(), [])).toBeNull();
	});

	it('does not flag a bill in line with history', () => {
		const c = compareBillToHistory(bill(), history)!;
		expect(c.sampleSize).toBe(3);
		expect(c.isCostAnomaly).toBe(false);
		expect(c.isUsageAnomaly).toBe(false);
	});

	it('flags a >30% cost spike', () => {
		const spike = bill({ totalCost: '6000' });
		const c = compareBillToHistory(spike, history)!;
		expect(c.isCostAnomaly).toBe(true);
		expect(c.costVariancePct).toBeGreaterThan(0.3);
	});

	it('flags a >30% usage drop', () => {
		const drop = bill({ usage: '15000' });
		const c = compareBillToHistory(drop, history)!;
		expect(c.isUsageAnomaly).toBe(true);
		expect(c.usageVariancePct).toBeLessThan(-0.3);
	});

	it('ignores bills from other accounts and later periods', () => {
		const otherAccount = bill({ id: 'x1', accountId: 'other', totalCost: '99999' });
		const later = bill({
			id: 'x2',
			periodStart: '2026-07-01',
			periodEnd: '2026-07-31',
			totalCost: '99999'
		});
		const c = compareBillToHistory(bill(), [...history, otherAccount, later])!;
		expect(c.sampleSize).toBe(3);
	});

	it('normalizes uneven period lengths via daily rates', () => {
		// Same daily cost (100/day) over a short period should not be flagged
		const short = bill({
			periodStart: '2026-06-01',
			periodEnd: '2026-06-15',
			totalCost: '1500',
			usage: '15000'
		});
		const c = compareBillToHistory(short, history)!;
		expect(c.isCostAnomaly).toBe(false);
	});
});

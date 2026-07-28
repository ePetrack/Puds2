import { describe, expect, it } from 'vitest';
import {
	reconcilePeriods,
	type PeriodUsage,
	type SubmeterPeriodUsage
} from '$lib/server/services/reconciliation-math';

const master = (...rows: [string, number][]): PeriodUsage[] =>
	rows.map(([period, usage]) => ({ period, usage }));

const sub = (...rows: [string, string, number][]): SubmeterPeriodUsage[] =>
	rows.map(([period, meterNumber, usage]) => ({
		period,
		meterId: meterNumber,
		meterNumber,
		usage
	}));

const at = (r: ReturnType<typeof reconcilePeriods>, period: string) =>
	r.periods.find((p) => p.period === period)!;

describe('reconcilePeriods — submeter coverage', () => {
	it('reports a master with no submeter reads rather than a 100% gap', () => {
		const r = reconcilePeriods(master(['2026-06', 1000]), []);
		const p = at(r, '2026-06');

		expect(p.status).toBe('no_submeters');
		expect(p.submeterCount).toBe(0);
		expect(p.submeterTotal).toBe(0);
		expect(p.delta).toBe(1000);
	});

	it('reconciles a single submeter', () => {
		const r = reconcilePeriods(master(['2026-06', 1000]), sub(['2026-06', 'S1', 750]));
		const p = at(r, '2026-06');

		expect(p.submeterCount).toBe(1);
		expect(p.delta).toBe(250);
		expect(p.deltaPct).toBe(25);
		expect(p.status).toBe('unaccounted');
	});

	it('sums several submeters in the same period', () => {
		const r = reconcilePeriods(
			master(['2026-06', 1000]),
			sub(['2026-06', 'S1', 450], ['2026-06', 'S2', 300], ['2026-06', 'S3', 200])
		);
		const p = at(r, '2026-06');

		expect(p.submeterCount).toBe(3);
		expect(p.submeterTotal).toBe(950);
		expect(p.delta).toBe(50);
		// 5% against the default 2% band, so this reads as unaccounted rather than balanced.
		expect(p.status).toBe('unaccounted');
	});
});

describe('reconcilePeriods — classification', () => {
	it('treats a small gap as balanced, inside the tolerance band', () => {
		const r = reconcilePeriods(master(['2026-06', 1000]), sub(['2026-06', 'S1', 990]));
		expect(at(r, '2026-06').status).toBe('balanced');
		expect(at(r, '2026-06').deltaPct).toBe(1);
	});

	it('flags submeters exceeding the master, which is not physically possible', () => {
		const r = reconcilePeriods(master(['2026-06', 1000]), sub(['2026-06', 'S1', 1200]));
		const p = at(r, '2026-06');

		expect(p.status).toBe('over_metered');
		expect(p.delta).toBe(-200);
		expect(p.deltaPct).toBe(-20);
	});

	it('does not treat partial coverage as a fault', () => {
		// A steady positive gap is the normal state wherever some loads are unmetered.
		const r = reconcilePeriods(
			master(['2026-06', 1000], ['2026-05', 1000]),
			sub(['2026-06', 'S1', 600], ['2026-05', 'S1', 600])
		);
		expect(r.periods.every((p) => p.status === 'unaccounted')).toBe(true);
		expect(r.summary.overMeteredPeriods).toBe(0);
	});

	it('honours a caller-supplied tolerance', () => {
		const tight = reconcilePeriods(master(['2026-06', 1000]), sub(['2026-06', 'S1', 990]), 0.5);
		expect(at(tight, '2026-06').status).toBe('unaccounted');

		const loose = reconcilePeriods(master(['2026-06', 1000]), sub(['2026-06', 'S1', 900]), 15);
		expect(at(loose, '2026-06').status).toBe('balanced');
	});
});

describe('reconcilePeriods — missing data is not zero', () => {
	it('yields a null delta when the master did not report', () => {
		const r = reconcilePeriods([], sub(['2026-06', 'S1', 400]));
		const p = at(r, '2026-06');

		expect(p.status).toBe('no_master');
		expect(p.masterUsage).toBeNull();
		expect(p.delta).toBeNull();
		expect(p.deltaPct).toBeNull();
		expect(p.submeterTotal).toBe(400);
	});

	it('excludes periods with no master read from the totals', () => {
		const r = reconcilePeriods(
			master(['2026-06', 1000]),
			sub(['2026-06', 'S1', 800], ['2026-05', 'S1', 700])
		);

		// May's 700 must not be subtracted from a master total that never covered it.
		expect(r.summary.masterTotal).toBe(1000);
		expect(r.summary.submeterTotal).toBe(800);
		expect(r.summary.delta).toBe(200);
		expect(r.summary.missingMasterPeriods).toBe(1);
		expect(r.summary.periods).toBe(1);
	});

	it('leaves deltaPct null when the master read zero', () => {
		const r = reconcilePeriods(master(['2026-06', 0]), sub(['2026-06', 'S1', 0]));
		expect(at(r, '2026-06').deltaPct).toBeNull();
	});
});

describe('reconcilePeriods — summary', () => {
	it('computes the span delta rather than averaging per-period percentages', () => {
		// 90% gap in a tiny period would swamp a mean; the span figure must not be fooled.
		const r = reconcilePeriods(
			master(['2026-06', 10_000], ['2026-05', 10]),
			sub(['2026-06', 'S1', 9500], ['2026-05', 'S1', 1])
		);

		expect(r.summary.masterTotal).toBe(10_010);
		expect(r.summary.submeterTotal).toBe(9501);
		expect(r.summary.deltaPct).toBeCloseTo(5.09, 1);
	});

	it('counts distinct submeters, not readings', () => {
		const r = reconcilePeriods(
			master(['2026-06', 1000]),
			sub(['2026-06', 'S1', 300], ['2026-06', 'S1', 200], ['2026-06', 'S2', 400])
		);
		const p = at(r, '2026-06');

		expect(p.submeterCount).toBe(2);
		expect(p.submeterTotal).toBe(900);
	});

	it('orders periods newest first', () => {
		const r = reconcilePeriods(master(['2026-04', 1], ['2026-06', 1], ['2026-05', 1]), []);
		expect(r.periods.map((p) => p.period)).toEqual(['2026-06', '2026-05', '2026-04']);
	});

	it('handles a master with no readings at all', () => {
		const r = reconcilePeriods([], []);
		expect(r.periods).toEqual([]);
		expect(r.summary.masterTotal).toBe(0);
		expect(r.summary.deltaPct).toBeNull();
	});
});

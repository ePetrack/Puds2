import { describe, expect, it } from 'vitest';
import {
	fitLinear,
	predict,
	G14_MONTHLY_CV_RMSE_MAX,
	type RegressionPoint
} from '$lib/server/services/regression';

/** Points from a known model, so the recovered coefficients can be checked exactly. */
function synthetic(
	intercept: number,
	bh: number,
	bc: number,
	rows: [number, number][],
	noise: number[] = []
): RegressionPoint[] {
	return rows.map(([hdd, cdd], i) => ({
		x: [hdd, cdd],
		y: intercept + bh * hdd + bc * cdd + (noise[i] ?? 0)
	}));
}

const MONTHS: [number, number][] = [
	[900, 0],
	[750, 0],
	[500, 20],
	[200, 90],
	[40, 260],
	[0, 480],
	[0, 610],
	[0, 570],
	[10, 330],
	[180, 80],
	[520, 10],
	[820, 0]
];

describe('fitLinear', () => {
	it('recovers the coefficients of a noiseless model', () => {
		const fit = fitLinear(synthetic(10_000, 12, 25, MONTHS))!;

		expect(fit.intercept).toBeCloseTo(10_000, 4);
		expect(fit.coefficients[0]).toBeCloseTo(12, 6);
		expect(fit.coefficients[1]).toBeCloseTo(25, 6);
		expect(fit.rSquared).toBeCloseTo(1, 6);
		expect(fit.n).toBe(12);
	});

	it('reports a perfect fit as acceptable under Guideline 14', () => {
		const fit = fitLinear(synthetic(10_000, 12, 25, MONTHS))!;
		expect(fit.cvRmse).toBeCloseTo(0, 6);
		expect(fit.nmbe).toBeCloseTo(0, 6);
		expect(fit.acceptable).toBe(true);
	});

	it('rejects a fit whose scatter exceeds the CV(RMSE) threshold', () => {
		// Noise large relative to the mean pushes CV(RMSE) past 15%.
		const noise = [9000, -8000, 7000, -9500, 8500, -7000, 9000, -8000, 7500, -9000, 8000, -7500];
		const fit = fitLinear(synthetic(10_000, 12, 25, MONTHS, noise))!;

		expect(fit.cvRmse).toBeGreaterThan(G14_MONTHLY_CV_RMSE_MAX);
		expect(fit.acceptable).toBe(false);
	});

	it('separates weather-independent load from weather sensitivity', () => {
		// A building with a big base load and shallow slopes.
		const fit = fitLinear(synthetic(50_000, 2, 3, MONTHS))!;
		expect(fit.intercept).toBeCloseTo(50_000, 3);
		expect(fit.coefficients[0]).toBeCloseTo(2, 6);
	});

	it('returns null with fewer points than parameters', () => {
		expect(fitLinear(synthetic(100, 1, 1, MONTHS.slice(0, 3)))).toBeNull();
		expect(fitLinear([])).toBeNull();
	});

	it('returns null when predictors are collinear', () => {
		// Cooling degree days uniformly zero: the CDD coefficient is unidentifiable.
		const heatingOnly: [number, number][] = MONTHS.map(([h]) => [h, 0]);
		expect(fitLinear(synthetic(10_000, 12, 25, heatingOnly))).toBeNull();
	});

	it('returns null when the response is uniformly zero', () => {
		const points = MONTHS.map(([h, c]) => ({ x: [h, c], y: 0 }));
		expect(fitLinear(points)).toBeNull();
	});

	it('rejects points with inconsistent predictor counts', () => {
		const points = [...synthetic(10_000, 12, 25, MONTHS)];
		points[3] = { x: [100], y: 5000 };
		expect(fitLinear(points)).toBeNull();
	});

	it('fits a single predictor', () => {
		const points = MONTHS.map(([h]) => ({ x: [h], y: 8000 + 15 * h }));
		const fit = fitLinear(points)!;

		expect(fit.intercept).toBeCloseTo(8000, 4);
		expect(fit.coefficients).toHaveLength(1);
		expect(fit.coefficients[0]).toBeCloseTo(15, 6);
	});
});

describe('predict', () => {
	it('applies the fitted model', () => {
		const fit = fitLinear(synthetic(10_000, 12, 25, MONTHS))!;
		expect(predict(fit, [500, 100])).toBeCloseTo(10_000 + 12 * 500 + 25 * 100, 3);
	});

	it('never predicts negative usage', () => {
		// An extrapolated model can go negative; consumption cannot.
		const fit = fitLinear(synthetic(1000, -50, 0.0001, MONTHS))!;
		expect(predict(fit, [10_000, 0])).toBe(0);
	});

	it('treats a missing predictor as zero rather than NaN', () => {
		const fit = fitLinear(synthetic(10_000, 12, 25, MONTHS))!;
		expect(predict(fit, [500])).toBeCloseTo(10_000 + 12 * 500, 3);
	});
});

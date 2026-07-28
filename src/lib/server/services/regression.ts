/**
 * Ordinary least squares with the fit statistics energy work is actually judged on —
 * pure, no database access, so it unit-tests directly.
 *
 * Weather-normalising a building means fitting its consumption against degree days:
 *
 *     usage = intercept + βh · HDD + βc · CDD
 *
 * The intercept is the weather-independent load (lighting, plug, process); the coefficients
 * are how hard the building works per degree-day of heating and cooling. Predicting from
 * that model tells you what a building *should* have used in a given month, which is the
 * only defensible way to compare buildings whose weather sensitivity differs.
 *
 * A model is only usable if it fits. ASHRAE Guideline 14 sets the thresholds this module
 * reports against, and `acceptable` applies them — a caller that ignores the statistics and
 * uses the coefficients anyway is doing exactly what the guideline exists to prevent.
 */

/** ASHRAE Guideline 14 thresholds for monthly (billing-period) data. */
export const G14_MONTHLY_CV_RMSE_MAX = 15;
export const G14_MONTHLY_NMBE_MAX = 5;

/** The minimum ASHRAE and IPMVP both expect for an annual baseline. */
export const MIN_BASELINE_POINTS = 12;

export interface RegressionPoint {
	/** Predictor values, in a consistent order across points. */
	x: number[];
	y: number;
}

export interface RegressionFit {
	/** Weather-independent load. */
	intercept: number;
	/** One coefficient per predictor, in the order supplied. */
	coefficients: number[];
	/** Points used. */
	n: number;
	rSquared: number;
	/** Coefficient of variation of the root mean squared error, as a percentage. */
	cvRmse: number;
	/** Normalised mean bias error, as a percentage. Signed. */
	nmbe: number;
	/** Whether the fit clears the Guideline 14 monthly thresholds. */
	acceptable: boolean;
}

/**
 * Solve `A · x = b` by Gaussian elimination with partial pivoting.
 * Returns null when the system is singular — collinear predictors, most often a period
 * where one of heating or cooling degree days is uniformly zero.
 */
function solve(a: number[][], b: number[]): number[] | null {
	const n = b.length;
	const m = a.map((row, i) => [...row, b[i]]);

	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let r = col + 1; r < n; r++) {
			if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
		}
		if (Math.abs(m[pivot][col]) < 1e-10) return null;
		[m[col], m[pivot]] = [m[pivot], m[col]];

		for (let r = 0; r < n; r++) {
			if (r === col) continue;
			const factor = m[r][col] / m[col][col];
			for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
		}
	}

	// Gauss-Jordan leaves the matrix diagonal, so each unknown is one division.
	return m.map((row, i) => row[n] / row[i]);
}

/**
 * Fit `y = intercept + Σ βᵢ·xᵢ` and report how well it fits.
 *
 * Returns null when there are fewer points than parameters, or when the predictors are
 * collinear — both cases where a coefficient would be arithmetic rather than evidence.
 */
export function fitLinear(points: RegressionPoint[]): RegressionFit | null {
	if (points.length === 0) return null;
	const k = points[0].x.length;
	const p = k + 1; // parameters, including the intercept
	if (points.length <= p) return null;
	if (points.some((pt) => pt.x.length !== k)) return null;

	// Normal equations: (XᵀX) β = Xᵀy, with a leading 1 for the intercept.
	const design = points.map((pt) => [1, ...pt.x]);
	const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
	const xty: number[] = new Array(p).fill(0);

	for (let i = 0; i < points.length; i++) {
		for (let r = 0; r < p; r++) {
			xty[r] += design[i][r] * points[i].y;
			for (let c = 0; c < p; c++) xtx[r][c] += design[i][r] * design[i][c];
		}
	}

	const beta = solve(xtx, xty);
	if (!beta || beta.some((v) => !Number.isFinite(v))) return null;

	const n = points.length;
	const meanY = points.reduce((a, pt) => a + pt.y, 0) / n;
	if (meanY === 0) return null;

	let sse = 0;
	let sst = 0;
	let bias = 0;
	for (let i = 0; i < n; i++) {
		const predicted = design[i].reduce((acc, v, j) => acc + v * beta[j], 0);
		const residual = points[i].y - predicted;
		sse += residual * residual;
		sst += (points[i].y - meanY) ** 2;
		bias += residual;
	}

	const cvRmse = (Math.sqrt(sse / (n - p)) / meanY) * 100;
	const nmbe = (bias / ((n - p) * meanY)) * 100;

	return {
		intercept: beta[0],
		coefficients: beta.slice(1),
		n,
		rSquared: sst === 0 ? 0 : 1 - sse / sst,
		cvRmse,
		nmbe,
		acceptable:
			Math.abs(cvRmse) <= G14_MONTHLY_CV_RMSE_MAX && Math.abs(nmbe) <= G14_MONTHLY_NMBE_MAX
	};
}

/** Apply a fitted model to one set of predictor values. Never returns a negative usage. */
export function predict(fit: RegressionFit, x: number[]): number {
	const raw = fit.coefficients.reduce((acc, b, i) => acc + b * (x[i] ?? 0), fit.intercept);
	return Math.max(0, raw);
}

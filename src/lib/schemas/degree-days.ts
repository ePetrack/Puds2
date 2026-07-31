import { z } from 'zod';
import { optionalText } from './helpers';

/**
 * Degree days are stored per weather station, per calendar month, per base temperature.
 * Those three fields are the natural key: the same month at a 65°F base and a 60°F base are
 * different series, not a conflict.
 */

/**
 * The minimum ASHRAE Guideline 14 and IPMVP both expect for an annual baseline. It lives
 * here rather than beside the regression code because the degree-day UI has to quote the
 * same number, and importing `$lib/server` from a `.svelte` file typechecks but breaks the
 * build.
 */
export const MIN_BASELINE_MONTHS = 12;

/**
 * Accepts `YYYY-MM` or `YYYY-MM-DD` and normalises to the first of the month, because
 * `degree_days.period` is a month bucket and a series that mixed `-01` with `-31` would
 * silently fail to join against itself.
 */
const monthPeriod = z.preprocess(
	(v) => {
		if (typeof v !== 'string') return v;
		const s = v.trim();
		if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s.slice(0, 7)}-01`;
		return s;
	},
	z.string().regex(/^\d{4}-\d{2}-01$/, 'Period must be a month, as YYYY-MM or YYYY-MM-DD')
);

/**
 * A required number that rejects a blank cell instead of coercing it.
 *
 * `z.coerce.number()` turns `''` into `0`, which for degree days is actively dangerous: a
 * month with genuinely zero cooling is ordinary, so a blank CDD silently becomes a real,
 * plausible-looking measurement and the regression fits against a value nobody recorded.
 * Missing data has to stay missing.
 */
const requiredNumber = (label: string, opts: { min?: number; max?: number } = {}) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		(() => {
			let n = z.coerce.number({ message: `${label} is required` });
			if (opts.min !== undefined) n = n.min(opts.min);
			if (opts.max !== undefined) n = n.max(opts.max);
			return n;
		})()
	);

export const degreeDaySchema = z.object({
	station: z.string().trim().min(1, 'Station is required').max(120),
	period: monthPeriod,
	// A base temperature is always recorded rather than assumed, so a series imported at a
	// non-default balance point can't be silently compared against a 65°F one.
	baseTempF: requiredNumber('Base temperature', { min: 0, max: 120 }),
	hdd: requiredNumber('HDD', { min: 0 }),
	cdd: requiredNumber('CDD', { min: 0 }),
	source: optionalText(200)
});

export type DegreeDayInput = z.infer<typeof degreeDaySchema>;

/** Columns the importer reads, in the order the sample template presents them. */
export const DEGREE_DAY_CSV_COLUMNS = [
	'station',
	'period',
	'base_temp_f',
	'hdd',
	'cdd',
	'source'
] as const;

import { z } from 'zod';

/** Empty form strings become undefined; otherwise trim. */
export const optionalText = (max = 500) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z.string().trim().max(max).optional()
	);

/** Empty form strings become undefined; otherwise coerce to a number. */
export const optionalNumber = (opts: { min?: number; max?: number; int?: boolean } = {}) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		(() => {
			let n = z.coerce.number();
			if (opts.int) n = n.int();
			if (opts.min !== undefined) n = n.min(opts.min);
			if (opts.max !== undefined) n = n.max(opts.max);
			return n.optional();
		})()
	);

/** Empty form strings become undefined; otherwise require YYYY-MM-DD. */
export const optionalDate = () =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
			.optional()
	);

/** Convert FormData into a plain object for schema parsing. */
export function formDataToObject(form: FormData): Record<string, string> {
	const obj: Record<string, string> = {};
	for (const [key, value] of form.entries()) {
		if (typeof value === 'string') obj[key] = value;
	}
	return obj;
}

/**
 * Flatten a ZodError into `{ field: message }` for form display.
 *
 * Generic over the parsed shape because zod v4's `safeParse` returns `ZodError<T>`, and the
 * bare `ZodError` this used to take is not assignable from it — which is why all 24 call
 * sites carried a `parsed.error as z.ZodError` cast. A cast repeated everywhere is a
 * signature that doesn't fit, not a language limitation.
 */
export function fieldErrors<T>(error: z.ZodError<T>): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || '_form';
		if (!(key in errors)) errors[key] = issue.message;
	}
	return errors;
}

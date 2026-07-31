/**
 * The shape every paginated list service returns.
 *
 * It used to live in `clients.ts`, so nine unrelated services imported a core type from a
 * sibling entity — `import type { Paginated } from './clients'` in the degree-day service is
 * the kind of coupling that makes a module graph hard to reason about.
 */
export interface Paginated<T> {
	items: T[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

/** Page bounds applied identically by every list service. */
export const DEFAULT_PER_PAGE = 25;
export const MAX_PER_PAGE = 100;

/**
 * Clamp caller-supplied paging into a range the database can serve. `page` and `perPage`
 * arrive from a query string, so "0", "-1" and "100000" all have to land somewhere sane.
 */
export function pageBounds(params: { page?: number; perPage?: number } = {}): {
	page: number;
	perPage: number;
	offset: number;
} {
	const page = Math.max(1, Math.floor(params.page ?? 1));
	const perPage = Math.min(
		MAX_PER_PAGE,
		Math.max(1, Math.floor(params.perPage ?? DEFAULT_PER_PAGE))
	);
	return { page, perPage, offset: (page - 1) * perPage };
}

/** Assemble the envelope from a page of rows and the matching total. */
export function paginate<T>(
	items: T[],
	total: number,
	page: number,
	perPage: number
): Paginated<T> {
	return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/**
 * One place to build a paginated list URL.
 *
 * Every list page needs the same thing: keep the active filters in the query string while
 * changing the page, and drop `page=1` so the first page has a clean URL. That was written
 * out by hand on each list page, which meant eight copies to keep in step.
 */

export type ListFilters = Record<string, string | number | null | undefined>;

export function listHref(basePath: string, filters: ListFilters, page = 1): string {
	const params: string[] = [];
	for (const [key, value] of Object.entries(filters)) {
		// A blank filter is "no filter" — it should not appear in the URL at all.
		if (value === null || value === undefined || value === '') continue;
		params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	}
	if (page > 1) params.push(`page=${page}`);
	return params.length ? `${basePath}?${params.join('&')}` : basePath;
}

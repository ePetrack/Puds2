/**
 * Guards for values that arrive from a URL and end up in a query.
 *
 * Every id column is a Postgres `uuid`, so a malformed id doesn't come back empty — it makes
 * the *query itself* fail with `invalid input syntax for type uuid`. That throw is unhandled,
 * so `/clients/not-a-uuid` used to render a 500 where it plainly means 404, and the same
 * applied to the `?client=`, `?meter=`, `?building=` and `?account=` list filters.
 *
 * Route ids are guarded by the `[id=uuid]` matcher in `src/params/uuid.ts`, which uses
 * `isUuid` below; query-string filters use `optionalUuid`.
 *
 * This lives in `$lib/utils`, **not** `$lib/server`, because SvelteKit param matchers run on
 * the client as well as the server — a `$lib/server` import here typechecks fine and then
 * fails the build with `vite-plugin-sveltekit-guard: An impossible situation occurred`.
 *
 * Canonical 8-4-4-4-12 only. Postgres also accepts a few looser spellings (no dashes, wrapped
 * in braces), but nothing in the app ever links that way, and answering "not found" to a
 * hand-typed URL is defensible.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
	return typeof value === 'string' && UUID.test(value);
}

/**
 * A filter value that may be absent or junk. Junk is **ignored** rather than fatal: a filter
 * is a UI affordance, not an assertion about the data, so a malformed one should show the
 * unfiltered list instead of an error page.
 */
export function optionalUuid(value: string | null | undefined): string | undefined {
	return isUuid(value) ? value : undefined;
}

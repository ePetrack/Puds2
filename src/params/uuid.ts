import type { ParamMatcher } from '@sveltejs/kit';
import { isUuid } from '$lib/utils/uuid';

/**
 * Route matcher for `[id=uuid]`.
 *
 * Every id column is a Postgres `uuid`, so a malformed id does not come back empty — it makes
 * the *query itself* fail with `invalid input syntax for type uuid`, and that unhandled throw
 * rendered a 500 where `/clients/not-a-uuid` plainly means 404.
 *
 * Matching at the route level rather than inside each load means a new detail route cannot
 * forget the guard, and SvelteKit answers 404 before any database work happens.
 */
export const match: ParamMatcher = (param) => isUuid(param);

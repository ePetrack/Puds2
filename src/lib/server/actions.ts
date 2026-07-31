import { fail } from '@sveltejs/kit';
import type { Action } from '@sveltejs/kit';
import { requireRole, WRITE_ROLES } from './authz';
import { isUuid } from '$lib/utils/uuid';

/**
 * The delete action every list page repeats: authorize, read the id, call the service, log,
 * and report a `deleteError` the page can surface. Thirteen copies were identical apart from
 * the entity noun.
 *
 * The failure messages keep the exact wording the hand-written copies produced, so
 * `ConfirmDelete`'s `deleteError` path is unchanged — this is a refactor, and the existing
 * e2e specs are the contract.
 */
export function deleteAction(options: {
	/** Capitalised singular used in the messages, e.g. `Campus` → "Campus not found". */
	entity: string;
	/** Key the id is logged under, e.g. `campusId`. Defaults to `id`. */
	logKey?: string;
	/** Overrides the log line where it differs from `<entity> deleted`. */
	logMessage?: string;
	/**
	 * Message for a delete the database refuses because something still references the row
	 * (an FK `restrict`). Supplying it turns a throw into a **409 with a reason** instead of a
	 * 500 — `/utilities/providers` is the case that already did this by hand.
	 */
	conflictMessage?: string;
	remove: (actorId: string, id: string) => Promise<boolean>;
}): Action {
	const { entity, logKey = 'id', conflictMessage, remove } = options;
	const lower = entity.toLowerCase();
	const logMessage = options.logMessage ?? `${lower} deleted`;

	return async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: `Missing ${lower} id` });
		// Ids reach a `uuid` column, where a malformed value fails the query rather than
		// matching nothing — see `QA-1`.
		if (!isUuid(id)) return fail(404, { deleteError: `${entity} not found` });

		let deleted: boolean;
		try {
			deleted = await remove(user.id, id);
		} catch (err) {
			if (!conflictMessage) throw err;
			return fail(409, { deleteError: conflictMessage });
		}
		if (!deleted) return fail(404, { deleteError: `${entity} not found` });

		locals.log.info({ [logKey]: id }, logMessage);
		return { deleted: true };
	};
}

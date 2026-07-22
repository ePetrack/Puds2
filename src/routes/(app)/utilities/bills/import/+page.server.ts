import { fail } from '@sveltejs/kit';
import { importBillsCSV } from '$lib/server/services/utility-bills';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions } from './$types';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const file = form.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Choose a CSV file to import' });
		}
		if (file.size > MAX_CSV_BYTES) {
			return fail(400, { error: 'File is too large (5 MB max)' });
		}

		const text = await file.text();
		const result = await importBillsCSV(user.id, text);

		locals.log.info(
			{ imported: result.imported, failed: result.failures.length },
			'bill CSV import'
		);
		return { result };
	}
};

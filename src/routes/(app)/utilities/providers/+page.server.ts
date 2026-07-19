import { fail } from '@sveltejs/kit';
import { listProviders, deleteProvider } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { providers: await listProviders() };
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing provider id' });

		try {
			const deleted = await deleteProvider(user.id, id);
			if (!deleted) return fail(404, { deleteError: 'Provider not found' });
		} catch {
			// FK restrict: provider still referenced by accounts
			return fail(409, {
				deleteError: 'Provider is referenced by utility accounts and cannot be deleted'
			});
		}

		locals.log.info({ providerId: id }, 'utility provider deleted');
		return { deleted: true };
	}
};

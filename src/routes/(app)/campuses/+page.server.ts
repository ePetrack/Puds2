import { fail } from '@sveltejs/kit';
import { listCampuses, deleteCampus } from '$lib/server/services/campuses';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = optionalUuid(url.searchParams.get('client')) ?? undefined;

	const [campuses, clientsPage] = await Promise.all([
		listCampuses({ page, search, clientId }),
		listClients({ perPage: 100 })
	]);

	return {
		campuses,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { search: search ?? '', client: clientId ?? '' }
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing campus id' });

		const deleted = await deleteCampus(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Campus not found' });

		locals.log.info({ campusId: id }, 'campus deleted');
		return { deleted: true };
	}
};

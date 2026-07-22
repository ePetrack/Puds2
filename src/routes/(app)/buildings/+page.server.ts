import { fail } from '@sveltejs/kit';
import { listBuildings, deleteBuilding } from '$lib/server/services/buildings';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = url.searchParams.get('client') ?? undefined;

	const [buildings, clientsPage] = await Promise.all([
		listBuildings({ page, search, clientId }),
		listClients({ perPage: 100 })
	]);

	return {
		buildings,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { search: search ?? '', client: clientId ?? '' }
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing building id' });

		const deleted = await deleteBuilding(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Building not found' });

		locals.log.info({ buildingId: id }, 'building deleted');
		return { deleted: true };
	}
};

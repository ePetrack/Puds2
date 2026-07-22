import { fail } from '@sveltejs/kit';
import { listComplexes, deleteComplex } from '$lib/server/services/complexes';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = url.searchParams.get('client') ?? undefined;

	const [complexes, clientsPage] = await Promise.all([
		listComplexes({ page, search, clientId }),
		listClients({ perPage: 100 })
	]);

	return {
		complexes,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { search: search ?? '', client: clientId ?? '' }
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing complex id' });

		const deleted = await deleteComplex(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Complex not found' });

		locals.log.info({ complexId: id }, 'complex deleted');
		return { deleted: true };
	}
};

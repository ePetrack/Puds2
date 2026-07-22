import { fail } from '@sveltejs/kit';
import { listClients, deleteClient } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import { CLIENT_STATUSES } from '$lib/schemas/client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const statusParam = url.searchParams.get('status') ?? '';
	const status = (CLIENT_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as (typeof CLIENT_STATUSES)[number])
		: undefined;

	return {
		clients: await listClients({ page, search, status }),
		filters: { search: search ?? '', status: statusParam }
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing client id' });

		const deleted = await deleteClient(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Client not found' });

		locals.log.info({ clientId: id }, 'client deleted');
		return { deleted: true };
	}
};

import { listClients, deleteClient } from '$lib/server/services/clients';
import { deleteAction } from '$lib/server/actions';
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
	delete: deleteAction({
		entity: 'Client',
		logKey: 'clientId',
		remove: deleteClient
	})
};

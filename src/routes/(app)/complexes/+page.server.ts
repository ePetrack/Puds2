import { listComplexes, deleteComplex } from '$lib/server/services/complexes';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = optionalUuid(url.searchParams.get('client')) ?? undefined;

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
	delete: deleteAction({
		entity: 'Complex',
		logKey: 'complexId',
		remove: deleteComplex
	})
};

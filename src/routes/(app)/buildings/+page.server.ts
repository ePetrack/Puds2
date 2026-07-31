import { listBuildings, deleteBuilding } from '$lib/server/services/buildings';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = optionalUuid(url.searchParams.get('client')) ?? undefined;

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
	delete: deleteAction({
		entity: 'Building',
		logKey: 'buildingId',
		remove: deleteBuilding
	})
};

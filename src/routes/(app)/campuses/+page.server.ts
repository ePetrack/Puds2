import { listCampuses, deleteCampus } from '$lib/server/services/campuses';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
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
	delete: deleteAction({
		entity: 'Campus',
		logKey: 'campusId',
		remove: deleteCampus
	})
};

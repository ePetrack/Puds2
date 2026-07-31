import { error } from '@sveltejs/kit';
import { getClient } from '$lib/server/services/clients';
import { listBuildings } from '$lib/server/services/buildings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const client = await getClient(params.id);
	if (!client) {
		error(404, 'Client not found');
	}

	const buildings = await listBuildings({ clientId: client.id, perPage: 100 });
	return { client, buildings: buildings.items };
};

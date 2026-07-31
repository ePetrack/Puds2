import { error } from '@sveltejs/kit';
import { getBuilding } from '$lib/server/services/buildings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const building = await getBuilding(params.id);
	if (!building) {
		error(404, 'Building not found');
	}
	return { building };
};

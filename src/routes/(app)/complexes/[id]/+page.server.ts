import { error } from '@sveltejs/kit';
import { getComplex, getComplexBuildings } from '$lib/server/services/complexes';
import { listMeters } from '$lib/server/services/meters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const complex = await getComplex(params.id);
	if (!complex) {
		error(404, 'Complex not found');
	}
	const [buildings, meters] = await Promise.all([
		getComplexBuildings(params.id),
		listMeters({ complexId: params.id })
	]);
	return { complex, buildings, meters };
};

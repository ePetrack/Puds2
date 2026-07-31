import { error } from '@sveltejs/kit';
import { getCampus, getCampusChildren } from '$lib/server/services/campuses';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const campus = await getCampus(params.id);
	if (!campus) {
		error(404, 'Campus not found');
	}
	const children = await getCampusChildren(params.id);
	return { campus, complexes: children.complexes, buildings: children.buildings };
};

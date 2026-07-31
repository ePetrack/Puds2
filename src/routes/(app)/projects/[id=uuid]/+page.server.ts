import { error } from '@sveltejs/kit';
import { getProject } from '$lib/server/services/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await getProject(params.id);
	if (!project) {
		error(404, 'Project not found');
	}
	return { project };
};

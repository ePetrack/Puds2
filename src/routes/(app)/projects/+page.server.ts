import { listProjects, deleteProject } from '$lib/server/services/projects';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import { PROJECT_STATUSES } from '$lib/schemas/project';
import type { Project } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;
	const clientId = optionalUuid(url.searchParams.get('client')) ?? '';
	const statusParam = url.searchParams.get('status') ?? '';
	const status = (PROJECT_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as Project['status'])
		: undefined;

	const [projects, clientsPage] = await Promise.all([
		listProjects({ page, search, clientId: clientId || undefined, status }),
		listClients({ perPage: 100 })
	]);

	return {
		projects,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { search: search ?? '', client: clientId, status: statusParam }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Project',
		logKey: 'projectId',
		remove: deleteProject
	})
};

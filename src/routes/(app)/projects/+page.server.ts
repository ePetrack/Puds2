import { fail } from '@sveltejs/kit';
import { listProjects, deleteProject } from '$lib/server/services/projects';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
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
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing project id' });

		const deleted = await deleteProject(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Project not found' });

		locals.log.info({ projectId: id }, 'project deleted');
		return { deleted: true };
	}
};

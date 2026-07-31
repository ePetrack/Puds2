import { fail, redirect } from '@sveltejs/kit';
import { projectSchema } from '$lib/schemas/project';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createProject } from '$lib/server/services/projects';
import { listClients } from '$lib/server/services/clients';
import { listBuildings } from '$lib/server/services/buildings';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [clientsPage, buildingsPage] = await Promise.all([
		listClients({ perPage: 100 }),
		listBuildings({ perPage: 100 })
	]);
	return {
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		buildingOptions: buildingsPage.items.map((b) => ({
			id: b.id,
			name: b.name,
			clientId: b.clientId
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const values = formDataToObject(form);
		const buildingIds = form.getAll('buildingIds').map(String);

		const parsed = projectSchema.safeParse({ ...values, buildingIds });
		if (!parsed.success) {
			return fail(400, { values, buildingIds, errors: fieldErrors(parsed.error) });
		}

		const project = await createProject(user.id, parsed.data);
		locals.log.info({ projectId: project.id }, 'project created');
		redirect(303, `/projects/${project.id}`);
	}
};

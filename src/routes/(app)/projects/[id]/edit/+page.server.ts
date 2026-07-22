import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { projectSchema } from '$lib/schemas/project';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getProject, updateProject } from '$lib/server/services/projects';
import { listClients } from '$lib/server/services/clients';
import { listBuildings } from '$lib/server/services/buildings';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [project, clientsPage, buildingsPage] = await Promise.all([
		getProject(params.id),
		listClients({ perPage: 100 }),
		listBuildings({ perPage: 100 })
	]);
	if (!project) {
		error(404, 'Project not found');
	}

	return {
		values: {
			clientId: project.clientId,
			name: project.name,
			description: project.description ?? '',
			status: project.status,
			startDate: project.startDate ?? '',
			endDate: project.endDate ?? '',
			budget: project.budget ?? '',
			actualCost: project.actualCost ?? '',
			expectedAnnualSavings: project.expectedAnnualSavings ?? '',
			actualAnnualSavings: project.actualAnnualSavings ?? '',
			roiYears: project.roiYears ?? '',
			notes: project.notes ?? ''
		} as Record<string, string>,
		selectedBuildings: project.buildings.map((b) => b.id),
		projectId: project.id,
		projectName: project.name,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		buildingOptions: buildingsPage.items.map((b) => ({
			id: b.id,
			name: b.name,
			clientId: b.clientId
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const values = formDataToObject(form);
		const buildingIds = form.getAll('buildingIds').map(String);

		const parsed = projectSchema.safeParse({ ...values, buildingIds });
		if (!parsed.success) {
			return fail(400, { values, buildingIds, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateProject(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Project not found');
		}

		locals.log.info({ projectId: params.id }, 'project updated');
		redirect(303, `/projects/${params.id}`);
	}
};

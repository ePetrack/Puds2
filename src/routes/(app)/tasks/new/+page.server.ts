import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { taskSchema } from '$lib/schemas/task';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createTask, listUsers } from '$lib/server/services/tasks';
import { listProjects } from '$lib/server/services/projects';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [users, projectsPage, clientsPage] = await Promise.all([
		listUsers(),
		listProjects({ perPage: 100 }),
		listClients({ perPage: 100 })
	]);
	return {
		userOptions: users,
		projectOptions: projectsPage.items.map((p) => ({ id: p.id, name: p.name })),
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name }))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = taskSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const task = await createTask(user.id, parsed.data);
		locals.log.info({ taskId: task.id }, 'task created');
		redirect(303, '/tasks');
	}
};

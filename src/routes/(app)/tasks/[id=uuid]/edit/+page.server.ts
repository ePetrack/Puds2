import { error, fail, redirect } from '@sveltejs/kit';
import { taskSchema } from '$lib/schemas/task';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getTask, updateTask, listUsers } from '$lib/server/services/tasks';
import { listProjects } from '$lib/server/services/projects';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [task, users, projectsPage, clientsPage] = await Promise.all([
		getTask(params.id),
		listUsers(),
		listProjects({ perPage: 100 }),
		listClients({ perPage: 100 })
	]);
	if (!task) {
		error(404, 'Task not found');
	}

	return {
		values: {
			title: task.title,
			description: task.description ?? '',
			status: task.status,
			priority: task.priority,
			dueDate: task.dueDate ?? '',
			assignedTo: task.assignedTo ?? '',
			projectId: task.projectId ?? '',
			clientId: task.clientId ?? ''
		} as Record<string, string>,
		taskTitle: task.title,
		userOptions: users,
		projectOptions: projectsPage.items.map((p) => ({ id: p.id, name: p.name })),
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name }))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = taskSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const updated = await updateTask(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Task not found');
		}

		locals.log.info({ taskId: params.id }, 'task updated');
		redirect(303, '/tasks');
	}
};

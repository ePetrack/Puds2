import { fail } from '@sveltejs/kit';
import { listTasks, setTaskStatus, deleteTask, listUsers } from '$lib/server/services/tasks';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import { TASK_STATUSES, TASK_PRIORITIES } from '$lib/schemas/task';
import type { Task } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const statusParam = url.searchParams.get('status') ?? '';
	const priorityParam = url.searchParams.get('priority') ?? '';
	const assignedTo = url.searchParams.get('assignee') ?? '';

	const status = (TASK_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as Task['status'])
		: undefined;
	const priority = (TASK_PRIORITIES as readonly string[]).includes(priorityParam)
		? (priorityParam as Task['priority'])
		: undefined;

	const [tasks, users] = await Promise.all([
		listTasks({
			page,
			status,
			priority,
			assignedTo: assignedTo || undefined,
			includeClosed: statusParam === 'all'
		}),
		listUsers()
	]);

	return {
		tasks,
		userOptions: users,
		filters: { status: statusParam, priority: priorityParam, assignee: assignedTo }
	};
};

export const actions: Actions = {
	setStatus: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '');
		if (!id || !(TASK_STATUSES as readonly string[]).includes(status)) {
			return fail(400, { statusError: 'Invalid request' });
		}

		const updated = await setTaskStatus(user.id, id, status as Task['status']);
		if (!updated) return fail(404, { statusError: 'Task not found' });

		locals.log.info({ taskId: id, status }, 'task status changed');
		return { statusChanged: true };
	},
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing task id' });

		const deleted = await deleteTask(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Task not found' });

		locals.log.info({ taskId: id }, 'task deleted');
		return { deleted: true };
	}
};

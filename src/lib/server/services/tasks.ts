import { and, asc, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { tasks, projects, clients, user, type Task } from '../db/schema';
import { recordAudit } from './audit';
import { auditedInsert, auditedUpdate, auditedDelete } from './audited';
import type { TaskInput } from '$lib/schemas/task';
import type { Paginated } from './pagination';

export type TaskWithRefs = Task & {
	assigneeName: string | null;
	creatorName: string | null;
	projectName: string | null;
	clientName: string | null;
};

const assignee = alias(user, 'assignee');
const creator = alias(user, 'creator');

const taskSelect = {
	task: tasks,
	assigneeName: assignee.name,
	creatorName: creator.name,
	projectName: projects.name,
	clientName: clients.name
};

function withRefs(r: {
	task: Task;
	assigneeName: string | null;
	creatorName: string | null;
	projectName: string | null;
	clientName: string | null;
}): TaskWithRefs {
	return {
		...r.task,
		assigneeName: r.assigneeName,
		creatorName: r.creatorName,
		projectName: r.projectName,
		clientName: r.clientName
	};
}

function toRow(input: TaskInput) {
	return {
		title: input.title,
		description: input.description ?? null,
		status: input.status,
		priority: input.priority,
		dueDate: input.dueDate ?? null,
		assignedTo: input.assignedTo ?? null,
		projectId: input.projectId ?? null,
		clientId: input.clientId ?? null
	};
}

export interface TaskListParams {
	page?: number;
	perPage?: number;
	status?: Task['status'];
	priority?: Task['priority'];
	assignedTo?: string;
	includeClosed?: boolean;
}

export async function listTasks(params: TaskListParams = {}): Promise<Paginated<TaskWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.status) conditions.push(eq(tasks.status, params.status));
	else if (!params.includeClosed) {
		conditions.push(sql`${tasks.status} in ('todo', 'in_progress')`);
	}
	if (params.priority) conditions.push(eq(tasks.priority, params.priority));
	if (params.assignedTo) conditions.push(eq(tasks.assignedTo, params.assignedTo));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select(taskSelect)
			.from(tasks)
			.leftJoin(assignee, eq(tasks.assignedTo, assignee.id))
			.leftJoin(creator, eq(tasks.createdBy, creator.id))
			.leftJoin(projects, eq(tasks.projectId, projects.id))
			.leftJoin(clients, eq(tasks.clientId, clients.id))
			.where(where)
			.orderBy(sql`${tasks.dueDate} asc nulls last`, desc(tasks.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(tasks).where(where)
	]);

	return {
		items: rows.map(withRefs),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function getTask(id: string): Promise<Task | undefined> {
	return db.query.tasks.findFirst({ where: eq(tasks.id, id) });
}

export async function createTask(actorId: string, input: TaskInput): Promise<Task> {
	// `createdBy` is set here rather than in `toRow`, because it comes from the session rather
	// than the form — it is the one field a task's author cannot choose.
	return auditedInsert(actorId, tasks, 'task', { ...toRow(input), createdBy: actorId });
}

export async function updateTask(
	actorId: string,
	id: string,
	input: TaskInput
): Promise<Task | undefined> {
	return auditedUpdate(actorId, tasks, tasks.id, 'task', id, toRow(input));
}

/** Quick status transition used by the list view. */
export async function setTaskStatus(actorId: string, id: string, status: Task['status']) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(tasks).where(eq(tasks.id, id));
		if (!before) return undefined;
		const [updated] = await tx
			.update(tasks)
			.set({ status, updatedAt: new Date() })
			.where(eq(tasks.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'task',
			entityId: id,
			action: 'update',
			changes: { status: { from: before.status, to: status } }
		});
		return updated;
	});
}

export async function deleteTask(actorId: string, id: string): Promise<boolean> {
	return auditedDelete(actorId, tasks, tasks.id, 'task', id, (deleted) => ({
		title: { from: deleted.title, to: null }
	}));
}

/** Users for assignee dropdowns. */
export async function listUsers(): Promise<{ id: string; name: string }[]> {
	return db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name));
}

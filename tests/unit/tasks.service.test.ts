import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	createTask,
	getTask,
	listTasks,
	setTaskStatus,
	updateTask,
	deleteTask
} from '$lib/server/services/tasks';
import { ensureTestActor, TEST_ACTOR } from './setup';

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(sql`TRUNCATE TABLE audit_log, tasks CASCADE`);
});

describe('tasks service', () => {
	it('creates a task with the actor as creator', async () => {
		const task = await createTask(TEST_ACTOR, {
			title: 'Review report',
			status: 'todo',
			priority: 'high'
		});
		expect(task.createdBy).toBe(TEST_ACTOR);
		expect((await getTask(task.id))?.title).toBe('Review report');
	});

	it('defaults the list to open tasks only', async () => {
		await createTask(TEST_ACTOR, { title: 'Open', status: 'todo', priority: 'medium' });
		await createTask(TEST_ACTOR, { title: 'Doing', status: 'in_progress', priority: 'medium' });
		await createTask(TEST_ACTOR, { title: 'Done', status: 'completed', priority: 'medium' });

		const open = await listTasks();
		expect(open.total).toBe(2);

		const all = await listTasks({ includeClosed: true });
		expect(all.total).toBe(3);

		const done = await listTasks({ status: 'completed' });
		expect(done.total).toBe(1);
	});

	it('orders by due date with undated tasks last', async () => {
		await createTask(TEST_ACTOR, { title: 'No date', status: 'todo', priority: 'low' });
		await createTask(TEST_ACTOR, {
			title: 'Later',
			status: 'todo',
			priority: 'low',
			dueDate: '2030-06-01'
		});
		await createTask(TEST_ACTOR, {
			title: 'Sooner',
			status: 'todo',
			priority: 'low',
			dueDate: '2030-01-01'
		});

		const list = await listTasks();
		expect(list.items.map((t) => t.title)).toEqual(['Sooner', 'Later', 'No date']);
	});

	it('transitions status and updates fields', async () => {
		const task = await createTask(TEST_ACTOR, { title: 'T', status: 'todo', priority: 'medium' });
		const done = await setTaskStatus(TEST_ACTOR, task.id, 'completed');
		expect(done?.status).toBe('completed');

		const updated = await updateTask(TEST_ACTOR, task.id, {
			title: 'T renamed',
			status: 'in_progress',
			priority: 'urgent'
		});
		expect(updated?.title).toBe('T renamed');
		expect(updated?.priority).toBe('urgent');
	});

	it('deletes tasks', async () => {
		const task = await createTask(TEST_ACTOR, { title: 'X', status: 'todo', priority: 'low' });
		expect(await deleteTask(TEST_ACTOR, task.id)).toBe(true);
		expect(await getTask(task.id)).toBeUndefined();
	});
});

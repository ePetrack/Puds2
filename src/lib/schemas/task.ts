import { z } from 'zod';
import { optionalText, optionalDate } from './helpers';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const taskSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(300),
	description: optionalText(10_000),
	status: z.enum(TASK_STATUSES),
	priority: z.enum(TASK_PRIORITIES),
	dueDate: optionalDate(),
	assignedTo: z.preprocess(emptyToUndefined, z.string().optional()),
	projectId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	clientId: z.preprocess(emptyToUndefined, z.string().uuid().optional())
});

export type TaskInput = z.infer<typeof taskSchema>;

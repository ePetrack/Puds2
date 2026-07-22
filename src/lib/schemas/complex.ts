import { z } from 'zod';
import { optionalText } from './helpers';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const complexSchema = z.object({
	clientId: z.string().uuid('Client is required'),
	campusId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
	code: optionalText(50),
	description: optionalText(2_000),
	notes: optionalText(10_000)
});

export type ComplexInput = z.infer<typeof complexSchema>;

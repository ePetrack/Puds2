import { z } from 'zod';
import { optionalText } from './helpers';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const documentMetaSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(300),
	description: optionalText(2_000),
	clientId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	projectId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	buildingId: z.preprocess(emptyToUndefined, z.string().uuid().optional())
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

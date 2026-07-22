import { z } from 'zod';
import { optionalText, optionalNumber } from './helpers';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const energyReadingSchema = z.object({
	meterId: z.string().uuid('Meter is required'),
	readingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Reading date is required'),
	usage: z.coerce.number({ message: 'Usage is required' }).min(0),
	demandKw: optionalNumber({ min: 0 }),
	cost: optionalNumber({ min: 0 }),
	readingType: z.preprocess(
		emptyToUndefined,
		z.enum(['actual', 'estimated']).optional().default('actual')
	),
	notes: optionalText(10_000)
});

export type EnergyReadingInput = z.infer<typeof energyReadingSchema>;

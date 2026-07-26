import { z } from 'zod';
import { optionalText, optionalNumber } from './helpers';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const BUILDING_TYPES = [
	'academic',
	'administrative',
	'residential',
	'laboratory',
	'athletic',
	'library',
	'healthcare',
	'dining',
	'other'
] as const;

export const buildingSchema = z.object({
	clientId: z.string().uuid('Client is required'),
	campusId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	complexId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
	buildingType: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z.enum(BUILDING_TYPES).optional()
	),
	squareFootage: optionalNumber({ min: 0, int: true }),
	yearBuilt: optionalNumber({ min: 1800, max: new Date().getFullYear() + 10, int: true }),
	floors: optionalNumber({ min: 1, int: true }),
	occupancy: optionalNumber({ min: 0, int: true }),
	address: optionalText(500),
	notes: optionalText(10_000)
});

export type BuildingInput = z.infer<typeof buildingSchema>;

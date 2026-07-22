import { z } from 'zod';
import { optionalText, optionalNumber, optionalDate } from './helpers';

export const PROJECT_STATUSES = [
	'planning',
	'approved',
	'in_progress',
	'completed',
	'on_hold',
	'cancelled'
] as const;

export const projectSchema = z.object({
	clientId: z.string().uuid('Client is required'),
	name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
	description: optionalText(10_000),
	status: z.enum(PROJECT_STATUSES),
	startDate: optionalDate(),
	endDate: optionalDate(),
	budget: optionalNumber({ min: 0 }),
	actualCost: optionalNumber({ min: 0 }),
	expectedAnnualSavings: optionalNumber({ min: 0 }),
	actualAnnualSavings: optionalNumber({ min: 0 }),
	roiYears: optionalNumber({ min: 0 }),
	notes: optionalText(10_000),
	// Multi-checkbox; routes collect repeated form entries into an array
	buildingIds: z.array(z.string().uuid()).default([])
});

export type ProjectInput = z.infer<typeof projectSchema>;

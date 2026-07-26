import { z } from 'zod';
import { optionalText } from './helpers';

export const campusSchema = z.object({
	clientId: z.string().uuid('Client is required'),
	name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
	code: optionalText(50),
	address: optionalText(500),
	city: optionalText(120),
	state: optionalText(120),
	zip: optionalText(20),
	notes: optionalText(10_000)
});

export type CampusInput = z.infer<typeof campusSchema>;

import { z } from 'zod';
import { optionalText, optionalNumber, optionalDate } from './helpers';

export const CLIENT_STATUSES = ['active', 'inactive', 'prospective'] as const;

export const clientSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
	contactName: optionalText(200),
	contactEmail: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z.string().trim().email('Invalid email').max(320).optional()
	),
	contactPhone: optionalText(50),
	address: optionalText(500),
	city: optionalText(100),
	state: optionalText(50),
	zip: optionalText(20),
	contractStartDate: optionalDate(),
	contractEndDate: optionalDate(),
	contractValue: optionalNumber({ min: 0 }),
	status: z.enum(CLIENT_STATUSES),
	notes: optionalText(10_000)
});

export type ClientInput = z.infer<typeof clientSchema>;

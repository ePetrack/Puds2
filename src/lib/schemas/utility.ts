import { z } from 'zod';
import { optionalText, optionalNumber, optionalDate } from './helpers';

export const UTILITY_TYPES = [
	'electricity',
	'natural_gas',
	'water',
	'sewer',
	'steam',
	'chilled_water',
	'fuel_oil',
	'propane',
	'other'
] as const;

export const RATE_TYPES = ['flat', 'tiered', 'time_of_use', 'demand', 'custom'] as const;
export const ACCOUNT_STATUSES = ['active', 'pending', 'closed'] as const;
export const METER_STATUSES = ['active', 'inactive', 'retired'] as const;
export const METER_UNITS = [
	'kwh',
	'therms',
	'ccf',
	'mcf',
	'gallons',
	'kgal',
	'cubic_meters',
	'mlb',
	'ton_hours',
	'other'
] as const;
export const BILL_STATUSES = ['pending', 'approved', 'paid', 'disputed'] as const;

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const providerSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(200),
	// Multi-checkbox fields arrive as repeated form entries; routes collect them into an array
	utilityTypes: z.array(z.enum(UTILITY_TYPES)).default([]),
	accountManager: optionalText(200),
	phone: optionalText(50),
	email: z.preprocess(emptyToUndefined, z.string().trim().email('Invalid email').optional()),
	website: z.preprocess(
		emptyToUndefined,
		z.string().trim().url('Invalid URL (include https://)').optional()
	),
	address: optionalText(500),
	notes: optionalText(10_000)
});
export type ProviderInput = z.infer<typeof providerSchema>;

export const rateScheduleSchema = z.object({
	providerId: z.string().uuid('Provider is required'),
	name: z.string().trim().min(1, 'Name is required').max(200),
	utilityType: z.enum(UTILITY_TYPES),
	rateType: z.enum(RATE_TYPES),
	energyRate: optionalNumber({ min: 0 }),
	demandRate: optionalNumber({ min: 0 }),
	fixedMonthlyCharge: optionalNumber({ min: 0 }),
	unit: optionalText(50),
	effectiveDate: optionalDate(),
	endDate: optionalDate(),
	notes: optionalText(10_000)
});
export type RateScheduleInput = z.infer<typeof rateScheduleSchema>;

export const utilityAccountSchema = z.object({
	clientId: z.string().uuid('Client is required'),
	providerId: z.string().uuid('Provider is required'),
	accountNumber: z.string().trim().min(1, 'Account number is required').max(100),
	utilityType: z.enum(UTILITY_TYPES),
	status: z.enum(ACCOUNT_STATUSES),
	rateScheduleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
	serviceAddress: optionalText(500),
	startDate: optionalDate(),
	endDate: optionalDate(),
	notes: optionalText(10_000)
});
export type UtilityAccountInput = z.infer<typeof utilityAccountSchema>;

export const meterSchema = z
	.object({
		// Premise is exactly one of a building or a complex (enforced by the refine below).
		buildingId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		complexId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		parentMeterId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		accountId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		meterNumber: z.string().trim().min(1, 'Meter number is required').max(100),
		utilityType: z.enum(UTILITY_TYPES),
		unit: z.enum(METER_UNITS),
		status: z.enum(METER_STATUSES),
		multiplier: optionalNumber({ min: 0 }),
		installDate: optionalDate(),
		location: optionalText(200),
		notes: optionalText(10_000)
	})
	.refine((d) => (d.buildingId ? 1 : 0) + (d.complexId ? 1 : 0) === 1, {
		message: 'Select exactly one premise: a building or a complex',
		path: ['buildingId']
	});
export type MeterInput = z.infer<typeof meterSchema>;

export const utilityBillSchema = z
	.object({
		accountId: z.string().uuid('Account is required'),
		meterId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Statement date is required'),
		periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period start is required'),
		periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period end is required'),
		dueDate: optionalDate(),
		usage: optionalNumber({ min: 0 }),
		unit: optionalText(50),
		demandKw: optionalNumber({ min: 0 }),
		energyCharge: optionalNumber({ min: 0 }),
		demandCharge: optionalNumber({ min: 0 }),
		fixedCharge: optionalNumber({ min: 0 }),
		taxesFees: optionalNumber({ min: 0 }),
		otherCharges: optionalNumber({ min: 0 }),
		totalCost: z.coerce.number({ message: 'Total cost is required' }).min(0),
		status: z.enum(BILL_STATUSES),
		paymentDate: optionalDate(),
		readingType: z.preprocess(emptyToUndefined, z.enum(['actual', 'estimated']).optional()),
		notes: optionalText(10_000)
	})
	.refine((data) => data.periodEnd >= data.periodStart, {
		message: 'Period end must be on or after period start',
		path: ['periodEnd']
	});
export type UtilityBillInput = z.infer<typeof utilityBillSchema>;

/** Human-readable label for enum-ish values. */
export function formatEnumLabel(value?: string | null): string {
	if (!value) return '-';
	const special: Record<string, string> = {
		kwh: 'kWh',
		ccf: 'CCF',
		mcf: 'MCF',
		kgal: 'kGal',
		mlb: 'Mlb'
	};
	if (value in special) return special[value];
	return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

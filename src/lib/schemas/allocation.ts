import { z } from 'zod';
import { optionalText } from './helpers';

export const ALLOCATION_METHODS = [
	'submetered',
	'area',
	'occupancy',
	'equal',
	'fixed_percentage',
	'hybrid'
] as const;

/** Operator-facing description of what each method splits on and when to reach for it. */
export const ALLOCATION_METHOD_INFO: Record<
	(typeof ALLOCATION_METHODS)[number],
	{ label: string; description: string }
> = {
	submetered: {
		label: 'Submetered usage',
		description:
			'Measured consumption from each building’s submeter over the bill period. Most defensible; the master-minus-submeters shortfall becomes an explicit common-area line.'
	},
	area: {
		label: 'Square footage',
		description:
			'Pro-rata on gross floor area (BOMA-style). The usual fallback where submetering is absent.'
	},
	occupancy: {
		label: 'Occupancy',
		description:
			'Pro-rata on headcount. Appropriate for occupant-driven loads such as domestic water.'
	},
	equal: {
		label: 'Equal share',
		description: 'Even split across buildings. Only defensible for near-identical premises.'
	},
	fixed_percentage: {
		label: 'Fixed percentage',
		description:
			'Operator-supplied percentages, typically from a lease or interagency agreement. Must sum to 100%.'
	},
	hybrid: {
		label: 'Submetered, remainder by area',
		description:
			'Submetered where a submeter exists; the unaccounted remainder is still shown separately for review.'
	}
};

export const allocationSchema = z.object({
	method: z.enum(ALLOCATION_METHODS, { message: 'Choose an allocation method' }),
	notes: optionalText(2000)
});

export type AllocationInput = z.infer<typeof allocationSchema>;

/**
 * Fixed percentages arrive as one form field per building (`pct.<buildingId>`), since the
 * set of buildings is only known at render time. Returns undefined when none were sent.
 */
export function parseFixedPercentages(form: FormData): Record<string, number> | undefined {
	const pct: Record<string, number> = {};
	for (const [key, value] of form.entries()) {
		if (!key.startsWith('pct.') || typeof value !== 'string') continue;
		const buildingId = key.slice(4);
		const n = Number(value.trim() === '' ? 0 : value);
		if (!Number.isFinite(n)) continue;
		pct[buildingId] = n;
	}
	return Object.keys(pct).length > 0 ? pct : undefined;
}

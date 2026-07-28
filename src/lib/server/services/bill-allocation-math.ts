/**
 * Pure allocation arithmetic — no database access, so it is directly unit-testable.
 *
 * ISO 50001 and commercial-real-estate practice both require an allocation to be
 * reproducible and traceable, which drives two rules here:
 *
 *  1. Charge components are allocated **separately**. Energy (kWh), demand (kW) and
 *     fixed costs move independently — a premise with modest consumption but a
 *     coincident peak drives demand charges — so blending them into one percentage
 *     of the total misstates who caused what.
 *  2. Allocated amounts must sum **exactly** to the bill. Proportional splits produce
 *     fractions of a cent; the residue is reconciled onto the largest line rather than
 *     left to vanish, so the allocation reconciles against the invoice.
 */

export const ALLOCATION_METHODS = [
	'submetered',
	'area',
	'occupancy',
	'equal',
	'fixed_percentage',
	'hybrid',
	'weather_normalized'
] as const;

export type AllocationMethod = (typeof ALLOCATION_METHODS)[number];

/** A premise participating in the split. */
export interface AllocationTarget {
	buildingId: string;
	label: string;
	/** Measured submeter usage over the bill period, if any. */
	submeteredUsage?: number;
	squareFootage?: number | null;
	occupancy?: number | null;
	/** Operator-supplied percentage, only for `fixed_percentage`. */
	fixedPct?: number;
	/**
	 * Expected usage for the bill period from this building's own degree-day model, for
	 * `weather_normalized`. Supplied by the caller because fitting it needs the database;
	 * this module stays pure.
	 */
	normalizedUsage?: number;
}

/** The charge components being split, taken from the bill. */
export interface BillAmounts {
	usage?: number;
	demandKw?: number;
	energyCharge?: number;
	demandCharge?: number;
	fixedCharge?: number;
	otherCharges?: number;
	totalCost: number;
}

export interface AllocationLine {
	buildingId: string | null;
	label: string;
	basisValue: number | null;
	sharePct: number;
	usage: number;
	demandKw: number;
	energyCost: number;
	demandCost: number;
	fixedCost: number;
	totalCost: number;
	isRemainder: boolean;
}

export interface AllocationResult {
	method: AllocationMethod;
	lines: AllocationLine[];
	warnings: string[];
	/** Inputs as they were, so the run stays reproducible. */
	basis: Record<string, unknown>;
}

export class AllocationError extends Error {
	field: string;
	constructor(field: string, message: string) {
		super(message);
		this.name = 'AllocationError';
		this.field = field;
	}
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** The basis value each method splits on, and the label shown to the operator. */
function basisFor(method: AllocationMethod, t: AllocationTarget): number {
	switch (method) {
		case 'submetered':
		case 'hybrid':
			return t.submeteredUsage ?? 0;
		case 'area':
			return t.squareFootage ?? 0;
		case 'occupancy':
			return t.occupancy ?? 0;
		case 'equal':
			return 1;
		case 'fixed_percentage':
			return t.fixedPct ?? 0;
		case 'weather_normalized':
			return t.normalizedUsage ?? 0;
	}
}

export const BASIS_LABEL: Record<AllocationMethod, string> = {
	submetered: 'Submetered usage',
	area: 'Square footage',
	occupancy: 'Occupancy',
	equal: 'Equal share',
	fixed_percentage: 'Fixed %',
	hybrid: 'Submetered usage (remainder by area)',
	weather_normalized: 'Weather-normalised expected usage'
};

/**
 * Distribute `amount` across `shares` (which sum to 1), reconciling rounding residue
 * onto the largest share so the parts sum exactly to the whole.
 */
function distribute(amount: number, shares: number[], round: (n: number) => number): number[] {
	if (!amount) return shares.map(() => 0);
	const raw = shares.map((s) => round(amount * s));
	const residue = round(amount - raw.reduce((a, b) => a + b, 0));
	if (residue !== 0) {
		let largest = 0;
		for (let i = 1; i < shares.length; i++) if (shares[i] > shares[largest]) largest = i;
		raw[largest] = round(raw[largest] + residue);
	}
	return raw;
}

/**
 * Split a bill across targets.
 *
 * For `submetered` and `hybrid` the master total is compared against the sum of the
 * submeters; any shortfall is an explicit remainder line (common area / house load /
 * distribution loss) rather than being silently absorbed into the metered premises.
 */
export function allocateBill(
	method: AllocationMethod,
	targets: AllocationTarget[],
	bill: BillAmounts
): AllocationResult {
	if (targets.length === 0) {
		throw new AllocationError('targets', 'At least one building is required to allocate a bill');
	}

	const warnings: string[] = [];
	const bases = targets.map((t) => basisFor(method, t));

	if (method === 'fixed_percentage') {
		const sum = bases.reduce((a, b) => a + b, 0);
		if (Math.abs(sum - 100) > 0.01) {
			throw new AllocationError(
				'fixedPct',
				`Fixed percentages must sum to 100% (currently ${sum.toFixed(2)}%)`
			);
		}
	}

	const basisTotal = bases.reduce((a, b) => a + b, 0);
	if (basisTotal <= 0) {
		throw new AllocationError(
			'basis',
			`No ${BASIS_LABEL[method].toLowerCase()} recorded for these buildings — cannot allocate by this method`
		);
	}

	targets.forEach((t, i) => {
		if (bases[i] <= 0) {
			warnings.push(`${t.label} has no ${BASIS_LABEL[method].toLowerCase()} and receives no share`);
		}
	});

	// Remainder: master usage not accounted for by submeters.
	let remainderShare = 0;
	if ((method === 'submetered' || method === 'hybrid') && bill.usage && bill.usage > 0) {
		const unaccounted = bill.usage - basisTotal;
		if (unaccounted > 0.0005) {
			remainderShare = unaccounted / bill.usage;
			warnings.push(
				`${round3(unaccounted)} of ${round3(bill.usage)} units are unaccounted for by submeters ` +
					`(${(remainderShare * 100).toFixed(1)}%) — shown as a separate common-area line`
			);
		} else if (unaccounted < -0.0005) {
			warnings.push(
				`Submeters total ${round3(basisTotal)}, more than the master's ${round3(bill.usage)} — ` +
					`check for double-counting or a period mismatch`
			);
		}
	}

	const metered = 1 - remainderShare;
	const shares = bases.map((b) => (b / basisTotal) * metered);
	const allShares = remainderShare > 0 ? [...shares, remainderShare] : shares;

	// The percentage column is reconciled like every other column: three equal buildings
	// must read 33.333333 / 33.333333 / 33.333334, not a table that sums to 99.999999%.
	const sharePcts = distribute(100, allShares, round);
	const usages = distribute(bill.usage ?? 0, allShares, round3);
	const demands = distribute(bill.demandKw ?? 0, allShares, round3);
	const energyCosts = distribute(bill.energyCharge ?? 0, allShares, round2);
	const demandCosts = distribute(bill.demandCharge ?? 0, allShares, round2);
	// Fixed charges and taxes have no usage driver; they follow the same share.
	const fixedCosts = distribute(
		(bill.fixedCharge ?? 0) + (bill.otherCharges ?? 0),
		allShares,
		round2
	);
	const totals = distribute(bill.totalCost, allShares, round2);

	const lines: AllocationLine[] = targets.map((t, i) => ({
		buildingId: t.buildingId,
		label: t.label,
		basisValue: bases[i],
		sharePct: sharePcts[i],
		usage: usages[i],
		demandKw: demands[i],
		energyCost: energyCosts[i],
		demandCost: demandCosts[i],
		fixedCost: fixedCosts[i],
		totalCost: totals[i],
		isRemainder: false
	}));

	if (remainderShare > 0) {
		const i = targets.length;
		lines.push({
			buildingId: null,
			label: 'Unallocated / common area',
			basisValue: null,
			sharePct: sharePcts[i],
			usage: usages[i],
			demandKw: demands[i],
			energyCost: energyCosts[i],
			demandCost: demandCosts[i],
			fixedCost: fixedCosts[i],
			totalCost: totals[i],
			isRemainder: true
		});
	}

	return {
		method,
		lines,
		warnings,
		basis: {
			basisLabel: BASIS_LABEL[method],
			basisTotal,
			targets: targets.map((t, i) => ({ label: t.label, basis: bases[i] })),
			bill
		}
	};
}

function round(n: number) {
	return Math.round(n * 1e6) / 1e6;
}

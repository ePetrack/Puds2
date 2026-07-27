import { describe, expect, it } from 'vitest';
import {
	allocateBill,
	AllocationError,
	type AllocationTarget,
	type BillAmounts
} from '$lib/server/services/bill-allocation-math';

function target(overrides: Partial<AllocationTarget> & { buildingId: string }): AllocationTarget {
	return { label: overrides.buildingId, ...overrides };
}

/** A master bill whose components are deliberately not proportional to one another. */
function bill(overrides: Partial<BillAmounts> = {}): BillAmounts {
	return {
		usage: 100_000,
		demandKw: 400,
		energyCharge: 10_000,
		demandCharge: 5000,
		fixedCharge: 120,
		otherCharges: 880,
		totalCost: 16_000,
		...overrides
	};
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe('allocateBill — basis selection per method', () => {
	const targets = [
		target({ buildingId: 'a', submeteredUsage: 60_000, squareFootage: 100_000, occupancy: 300 }),
		target({ buildingId: 'b', submeteredUsage: 40_000, squareFootage: 300_000, occupancy: 100 })
	];

	it('splits by measured submeter usage', () => {
		const r = allocateBill('submetered', targets, bill());
		expect(r.lines.map((l) => l.sharePct)).toEqual([60, 40]);
	});

	it('splits by square footage', () => {
		const r = allocateBill('area', targets, bill());
		expect(r.lines.map((l) => l.sharePct)).toEqual([25, 75]);
	});

	it('splits by occupancy', () => {
		const r = allocateBill('occupancy', targets, bill());
		expect(r.lines.map((l) => l.sharePct)).toEqual([75, 25]);
	});

	it('splits equally', () => {
		const r = allocateBill('equal', targets, bill());
		expect(r.lines.map((l) => l.sharePct)).toEqual([50, 50]);
	});

	it('splits by operator-supplied percentages', () => {
		const withPct = [
			target({ buildingId: 'a', fixedPct: 70 }),
			target({ buildingId: 'b', fixedPct: 30 })
		];
		const r = allocateBill('fixed_percentage', withPct, bill());
		expect(r.lines.map((l) => l.sharePct)).toEqual([70, 30]);
	});

	it('rejects fixed percentages that do not sum to 100', () => {
		const withPct = [
			target({ buildingId: 'a', fixedPct: 70 }),
			target({ buildingId: 'b', fixedPct: 20 })
		];
		expect(() => allocateBill('fixed_percentage', withPct, bill())).toThrow(AllocationError);
	});
});

describe('allocateBill — charge components move independently', () => {
	it('allocates energy, demand and fixed cost each on the same share but as separate amounts', () => {
		const targets = [
			target({ buildingId: 'a', squareFootage: 75_000 }),
			target({ buildingId: 'b', squareFootage: 25_000 })
		];
		const r = allocateBill('area', targets, bill());

		expect(r.lines[0].energyCost).toBeCloseTo(7500, 2);
		expect(r.lines[0].demandCost).toBeCloseTo(3750, 2);
		// fixedCharge + otherCharges are allocated together.
		expect(r.lines[0].fixedCost).toBeCloseTo(750, 2);
		expect(r.lines[0].usage).toBeCloseTo(75_000, 3);
		expect(r.lines[0].demandKw).toBeCloseTo(300, 3);
	});

	it('sums each component exactly back to the bill', () => {
		const targets = [
			target({ buildingId: 'a', squareFootage: 1 }),
			target({ buildingId: 'b', squareFootage: 1 }),
			target({ buildingId: 'c', squareFootage: 1 })
		];
		// A three-way split of an odd cent is the classic rounding trap.
		const b = bill({ totalCost: 100.01, energyCharge: 33.34, demandCharge: 0, fixedCharge: 0 });
		const r = allocateBill('area', targets, b);

		expect(sum(r.lines.map((l) => l.totalCost))).toBeCloseTo(100.01, 10);
		expect(sum(r.lines.map((l) => l.energyCost))).toBeCloseTo(33.34, 10);
		expect(sum(r.lines.map((l) => l.sharePct))).toBeCloseTo(100, 6);
	});
});

describe('allocateBill — unaccounted remainder', () => {
	it('adds an explicit remainder line when submeters fall short of the master', () => {
		const targets = [
			target({ buildingId: 'a', submeteredUsage: 45_000 }),
			target({ buildingId: 'b', submeteredUsage: 30_000 })
		];
		const r = allocateBill('submetered', targets, bill({ usage: 100_000 }));

		expect(r.lines).toHaveLength(3);
		const remainder = r.lines.at(-1)!;
		expect(remainder.isRemainder).toBe(true);
		expect(remainder.buildingId).toBeNull();
		expect(remainder.sharePct).toBeCloseTo(25, 6);
		expect(remainder.usage).toBeCloseTo(25_000, 3);
		expect(r.warnings.some((w) => w.includes('unaccounted'))).toBe(true);
		expect(sum(r.lines.map((l) => l.totalCost))).toBeCloseTo(16_000, 10);
	});

	it('produces no remainder line when submeters account for the whole master', () => {
		const targets = [
			target({ buildingId: 'a', submeteredUsage: 60_000 }),
			target({ buildingId: 'b', submeteredUsage: 40_000 })
		];
		const r = allocateBill('submetered', targets, bill({ usage: 100_000 }));
		expect(r.lines).toHaveLength(2);
		expect(r.lines.some((l) => l.isRemainder)).toBe(false);
	});

	it('gives a single submeter the whole metered share and the rest to the remainder', () => {
		const targets = [target({ buildingId: 'a', submeteredUsage: 40_000 })];
		const r = allocateBill('submetered', targets, bill({ usage: 100_000 }));

		expect(r.lines).toHaveLength(2);
		expect(r.lines[0].sharePct).toBeCloseTo(40, 6);
		expect(r.lines[1].sharePct).toBeCloseTo(60, 6);
	});

	it('warns rather than inventing a negative remainder when submeters exceed the master', () => {
		const targets = [
			target({ buildingId: 'a', submeteredUsage: 70_000 }),
			target({ buildingId: 'b', submeteredUsage: 60_000 })
		];
		const r = allocateBill('submetered', targets, bill({ usage: 100_000 }));

		expect(r.lines.some((l) => l.isRemainder)).toBe(false);
		expect(r.warnings.some((w) => w.includes('more than the master'))).toBe(true);
		expect(sum(r.lines.map((l) => l.totalCost))).toBeCloseTo(16_000, 10);
	});
});

describe('allocateBill — missing data is an error, not a silent zero', () => {
	it('throws when no target has any basis value', () => {
		const targets = [target({ buildingId: 'a' }), target({ buildingId: 'b' })];
		expect(() => allocateBill('area', targets, bill())).toThrow(AllocationError);
	});

	it('throws when there are no targets at all', () => {
		expect(() => allocateBill('equal', [], bill())).toThrow(AllocationError);
	});

	it('warns about a target with no basis while still allocating the rest', () => {
		const targets = [
			target({ buildingId: 'a', squareFootage: 50_000 }),
			target({ buildingId: 'b', squareFootage: null })
		];
		const r = allocateBill('area', targets, bill());

		expect(r.lines[0].sharePct).toBe(100);
		expect(r.lines[1].sharePct).toBe(0);
		expect(r.warnings.some((w) => w.includes('receives no share'))).toBe(true);
	});
});

describe('allocateBill — reproducibility', () => {
	it('snapshots the inputs it used', () => {
		const targets = [
			target({ buildingId: 'a', squareFootage: 60_000 }),
			target({ buildingId: 'b', squareFootage: 40_000 })
		];
		const r = allocateBill('area', targets, bill());

		expect(r.basis).toMatchObject({ basisLabel: 'Square footage', basisTotal: 100_000 });
		expect(r.basis.targets).toEqual([
			{ label: 'a', basis: 60_000 },
			{ label: 'b', basis: 40_000 }
		]);
	});

	it('leaves absent charge components at zero rather than guessing', () => {
		const targets = [target({ buildingId: 'a', squareFootage: 1 })];
		const r = allocateBill('area', targets, {
			totalCost: 500,
			energyCharge: 500
		});
		expect(r.lines[0].demandCost).toBe(0);
		expect(r.lines[0].demandKw).toBe(0);
		expect(r.lines[0].totalCost).toBeCloseTo(500, 2);
	});
});

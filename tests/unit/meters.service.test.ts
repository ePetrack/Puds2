import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '$lib/server/services/clients';
import { createBuilding } from '$lib/server/services/buildings';
import { createComplex } from '$lib/server/services/complexes';
import {
	createMeter,
	updateMeter,
	listSubmeters,
	listMeters,
	MeterValidationError
} from '$lib/server/services/meters';
import type { MeterInput } from '$lib/schemas/utility';
import { resetDomainTables, ensureTestActor, TEST_ACTOR } from './setup';

let clientId: string;
let buildingId: string;
let complexId: string;

function meterInput(overrides: Partial<MeterInput> = {}): MeterInput {
	return {
		meterNumber: 'MTR',
		utilityType: 'electricity',
		unit: 'kwh',
		status: 'active',
		...overrides
	} as MeterInput;
}

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetDomainTables();
	const client = await createClient(TEST_ACTOR, { name: 'Owner U', status: 'active' as const });
	clientId = client.id;
	const building = await createBuilding(TEST_ACTOR, { clientId, name: 'Hall A' });
	buildingId = building.id;
	const complex = await createComplex(TEST_ACTOR, { clientId, name: 'Central District' });
	complexId = complex.id;
});

describe('meter premise (building XOR complex)', () => {
	it('creates a building meter', async () => {
		const meter = await createMeter(TEST_ACTOR, meterInput({ buildingId, meterNumber: 'B-1' }));
		expect(meter.buildingId).toBe(buildingId);
		expect(meter.complexId).toBeNull();
		expect(meter.isSubmeter).toBe(false);
	});

	it('creates a complex master meter', async () => {
		const meter = await createMeter(TEST_ACTOR, meterInput({ complexId, meterNumber: 'M-1' }));
		expect(meter.complexId).toBe(complexId);
		expect(meter.buildingId).toBeNull();
	});

	it('rejects a meter with no premise', async () => {
		await expect(createMeter(TEST_ACTOR, meterInput({ meterNumber: 'X' }))).rejects.toBeInstanceOf(
			MeterValidationError
		);
	});

	it('rejects a meter with both a building and a complex', async () => {
		await expect(
			createMeter(TEST_ACTOR, meterInput({ buildingId, complexId, meterNumber: 'X' }))
		).rejects.toBeInstanceOf(MeterValidationError);
	});
});

describe('meter submeters (parent link)', () => {
	it('links a submeter and derives isSubmeter, then lists it', async () => {
		const master = await createMeter(TEST_ACTOR, meterInput({ complexId, meterNumber: 'MASTER' }));
		const sub = await createMeter(
			TEST_ACTOR,
			meterInput({ buildingId, meterNumber: 'SUB', parentMeterId: master.id })
		);
		expect(sub.parentMeterId).toBe(master.id);
		expect(sub.isSubmeter).toBe(true);

		const children = await listSubmeters(master.id);
		expect(children).toHaveLength(1);
		expect(children[0].meterNumber).toBe('SUB');
		expect(children[0].parentMeterNumber).toBe('MASTER');
	});

	it('surfaces the premise name in listings', async () => {
		await createMeter(TEST_ACTOR, meterInput({ complexId, meterNumber: 'M-1' }));
		const [row] = await listMeters({ complexId });
		expect(row.premiseName).toBe('Central District');
		expect(row.complexName).toBe('Central District');
	});

	it('rejects a parent with a different utility type', async () => {
		const gasMaster = await createMeter(
			TEST_ACTOR,
			meterInput({ complexId, meterNumber: 'GAS', utilityType: 'natural_gas', unit: 'therms' })
		);
		await expect(
			createMeter(
				TEST_ACTOR,
				meterInput({ buildingId, meterNumber: 'ELEC', parentMeterId: gasMaster.id })
			)
		).rejects.toBeInstanceOf(MeterValidationError);
	});

	it('rejects a meter that is its own parent', async () => {
		const meter = await createMeter(TEST_ACTOR, meterInput({ buildingId, meterNumber: 'SELF' }));
		await expect(
			updateMeter(
				TEST_ACTOR,
				meter.id,
				meterInput({ buildingId, meterNumber: 'SELF', parentMeterId: meter.id })
			)
		).rejects.toBeInstanceOf(MeterValidationError);
	});

	it('rejects a parent change that would create a cycle', async () => {
		const a = await createMeter(TEST_ACTOR, meterInput({ buildingId, meterNumber: 'A' }));
		const b = await createMeter(
			TEST_ACTOR,
			meterInput({ buildingId, meterNumber: 'B', parentMeterId: a.id })
		);
		// A already feeds B; making A a child of B closes the loop.
		await expect(
			updateMeter(
				TEST_ACTOR,
				a.id,
				meterInput({ buildingId, meterNumber: 'A', parentMeterId: b.id })
			)
		).rejects.toBeInstanceOf(MeterValidationError);
	});
});

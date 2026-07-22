import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { meterSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import {
	getMeter,
	updateMeter,
	listMeterOptions,
	MeterValidationError
} from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { listComplexes } from '$lib/server/services/complexes';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [meter, buildingsPage, complexesPage, accounts, meterOptions] = await Promise.all([
		getMeter(params.id),
		listBuildings({ perPage: 100 }),
		listComplexes({ perPage: 100 }),
		listAccounts(),
		listMeterOptions()
	]);
	if (!meter) {
		error(404, 'Meter not found');
	}

	return {
		values: {
			buildingId: meter.buildingId ?? '',
			complexId: meter.complexId ?? '',
			parentMeterId: meter.parentMeterId ?? '',
			accountId: meter.accountId ?? '',
			meterNumber: meter.meterNumber,
			utilityType: meter.utilityType,
			unit: meter.unit,
			status: meter.status,
			multiplier: meter.multiplier ?? '',
			installDate: meter.installDate ?? '',
			location: meter.location ?? '',
			notes: meter.notes ?? ''
		} as Record<string, string>,
		meterNumber: meter.meterNumber,
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
		complexOptions: complexesPage.items.map((c) => ({ id: c.id, name: c.name })),
		// A meter cannot be its own parent; descendants are rejected server-side.
		parentMeterOptions: meterOptions.filter((m) => m.id !== meter.id),
		accountOptions: accounts.map((a) => ({
			id: a.id,
			accountNumber: a.accountNumber,
			utilityType: a.utilityType
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = meterSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		let updated;
		try {
			updated = await updateMeter(user.id, params.id, parsed.data);
		} catch (e) {
			if (e instanceof MeterValidationError) {
				return fail(400, { values, errors: { [e.field]: e.message } });
			}
			throw e;
		}
		if (!updated) {
			error(404, 'Meter not found');
		}

		locals.log.info({ meterId: params.id }, 'meter updated');
		redirect(303, '/utilities/meters');
	}
};

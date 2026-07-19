import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { meterSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getMeter, updateMeter } from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [meter, buildingsPage, accounts] = await Promise.all([
		getMeter(params.id),
		listBuildings({ perPage: 100 }),
		listAccounts()
	]);
	if (!meter) {
		error(404, 'Meter not found');
	}

	return {
		values: {
			buildingId: meter.buildingId,
			accountId: meter.accountId ?? '',
			meterNumber: meter.meterNumber,
			utilityType: meter.utilityType,
			unit: meter.unit,
			status: meter.status,
			isSubmeter: String(meter.isSubmeter),
			multiplier: meter.multiplier ?? '',
			installDate: meter.installDate ?? '',
			location: meter.location ?? '',
			notes: meter.notes ?? ''
		} as Record<string, string>,
		meterNumber: meter.meterNumber,
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
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

		const updated = await updateMeter(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Meter not found');
		}

		locals.log.info({ meterId: params.id }, 'meter updated');
		redirect(303, '/utilities/meters');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { meterSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createMeter, listMeterOptions, MeterValidationError } from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { listComplexes } from '$lib/server/services/complexes';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [buildingsPage, complexesPage, accounts, meterOptions] = await Promise.all([
		listBuildings({ perPage: 100 }),
		listComplexes({ perPage: 100 }),
		listAccounts(),
		listMeterOptions()
	]);
	return {
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
		complexOptions: complexesPage.items.map((c) => ({ id: c.id, name: c.name })),
		parentMeterOptions: meterOptions,
		accountOptions: accounts.map((a) => ({
			id: a.id,
			accountNumber: a.accountNumber,
			utilityType: a.utilityType
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = meterSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		try {
			const meter = await createMeter(user.id, parsed.data);
			locals.log.info({ meterId: meter.id }, 'meter created');
		} catch (e) {
			if (e instanceof MeterValidationError) {
				return fail(400, { values, errors: { [e.field]: e.message } });
			}
			throw e;
		}
		redirect(303, '/utilities/meters');
	}
};

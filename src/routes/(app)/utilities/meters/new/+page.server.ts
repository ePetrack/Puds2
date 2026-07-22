import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { meterSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createMeter } from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [buildingsPage, accounts] = await Promise.all([
		listBuildings({ perPage: 100 }),
		listAccounts()
	]);
	return {
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
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
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const meter = await createMeter(user.id, parsed.data);
		locals.log.info({ meterId: meter.id }, 'meter created');
		redirect(303, '/utilities/meters');
	}
};

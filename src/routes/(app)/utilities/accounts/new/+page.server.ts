import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { utilityAccountSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createAccount } from '$lib/server/services/utility-accounts';
import { listClients } from '$lib/server/services/clients';
import { listProviders } from '$lib/server/services/providers';
import { listRateSchedules } from '$lib/server/services/rate-schedules';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [clientsPage, providers, rates] = await Promise.all([
		listClients({ perPage: 100 }),
		listProviders(),
		listRateSchedules()
	]);
	return {
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		providerOptions: providers.map((p) => ({ id: p.id, name: p.name })),
		rateScheduleOptions: rates.map((r) => ({
			id: r.id,
			name: r.name,
			providerId: r.providerId,
			utilityType: r.utilityType
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = utilityAccountSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const account = await createAccount(user.id, parsed.data);
		locals.log.info({ accountId: account.id }, 'utility account created');
		redirect(303, '/utilities/accounts');
	}
};

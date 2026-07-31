import { error, fail, redirect } from '@sveltejs/kit';
import { utilityAccountSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getAccount, updateAccount } from '$lib/server/services/utility-accounts';
import { listClients } from '$lib/server/services/clients';
import { listProviders } from '$lib/server/services/providers';
import { listRateSchedules } from '$lib/server/services/rate-schedules';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [account, clientsPage, providers, rates] = await Promise.all([
		getAccount(params.id),
		listClients({ perPage: 100 }),
		listProviders(),
		listRateSchedules()
	]);
	if (!account) {
		error(404, 'Account not found');
	}

	return {
		values: {
			clientId: account.clientId,
			providerId: account.providerId,
			accountNumber: account.accountNumber,
			utilityType: account.utilityType,
			status: account.status,
			rateScheduleId: account.rateScheduleId ?? '',
			serviceAddress: account.serviceAddress ?? '',
			startDate: account.startDate ?? '',
			endDate: account.endDate ?? '',
			notes: account.notes ?? ''
		} as Record<string, string>,
		accountNumber: account.accountNumber,
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
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = utilityAccountSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const updated = await updateAccount(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Account not found');
		}

		locals.log.info({ accountId: params.id }, 'utility account updated');
		redirect(303, '/utilities/accounts');
	}
};

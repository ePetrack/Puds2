import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { utilityBillSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createBill } from '$lib/server/services/utility-bills';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { listMeters } from '$lib/server/services/meters';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [accounts, meters] = await Promise.all([listAccounts(), listMeters()]);
	return {
		accountOptions: accounts.map((a) => ({
			id: a.id,
			label: `${a.accountNumber} · ${a.utilityType}${a.providerName ? ' · ' + a.providerName : ''}`
		})),
		meterOptions: meters.map((m) => ({
			id: m.id,
			meterNumber: m.meterNumber,
			accountId: m.accountId
		})),
		preselectedAccount: url.searchParams.get('account') ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = utilityBillSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const bill = await createBill(user.id, parsed.data);
		locals.log.info({ billId: bill.id }, 'utility bill created');
		redirect(303, `/utilities/bills/${bill.id}`);
	}
};

import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { utilityBillSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getBill, updateBill } from '$lib/server/services/utility-bills';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { listMeters } from '$lib/server/services/meters';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [bill, accounts, meters] = await Promise.all([
		getBill(params.id),
		listAccounts(),
		listMeters()
	]);
	if (!bill) {
		error(404, 'Bill not found');
	}

	return {
		values: {
			accountId: bill.accountId,
			meterId: bill.meterId ?? '',
			statementDate: bill.statementDate,
			periodStart: bill.periodStart,
			periodEnd: bill.periodEnd,
			dueDate: bill.dueDate ?? '',
			usage: bill.usage ?? '',
			unit: bill.unit ?? '',
			demandKw: bill.demandKw ?? '',
			energyCharge: bill.energyCharge ?? '',
			demandCharge: bill.demandCharge ?? '',
			fixedCharge: bill.fixedCharge ?? '',
			taxesFees: bill.taxesFees ?? '',
			otherCharges: bill.otherCharges ?? '',
			totalCost: bill.totalCost,
			status: bill.status,
			paymentDate: bill.paymentDate ?? '',
			readingType: bill.readingType ?? '',
			notes: bill.notes ?? ''
		} as Record<string, string>,
		billId: bill.id,
		accountOptions: accounts.map((a) => ({
			id: a.id,
			label: `${a.accountNumber} · ${a.utilityType}${a.providerName ? ' · ' + a.providerName : ''}`
		})),
		meterOptions: meters.map((m) => ({
			id: m.id,
			meterNumber: m.meterNumber,
			accountId: m.accountId
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = utilityBillSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateBill(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Bill not found');
		}

		locals.log.info({ billId: params.id }, 'utility bill updated');
		redirect(303, `/utilities/bills/${params.id}`);
	}
};

import { error, fail, redirect } from '@sveltejs/kit';
import {
	getBill,
	billHistoryForAccount,
	setBillStatus,
	deleteBill
} from '$lib/server/services/utility-bills';
import {
	computeBillMetrics,
	compareBillToHistory,
	sumBillCharges,
	hasChargeMismatch
} from '$lib/server/services/bill-metrics';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import { BILL_STATUSES } from '$lib/schemas/utility';
import type { UtilityBill } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const bill = await getBill(params.id);
	if (!bill) {
		error(404, 'Bill not found');
	}

	const history = await billHistoryForAccount(bill.accountId);
	const previousBills = history
		.filter((b) => b.id !== bill.id && b.periodEnd < bill.periodStart)
		.slice(0, 6)
		.map((b) => ({ ...b, metrics: computeBillMetrics(b) }));

	return {
		bill,
		metrics: computeBillMetrics(bill),
		comparison: compareBillToHistory(bill, history),
		chargesSum: sumBillCharges(bill),
		chargesMismatch: hasChargeMismatch(bill),
		previousBills
	};
};

export const actions: Actions = {
	setStatus: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const status = String(form.get('status') ?? '');

		if (!(BILL_STATUSES as readonly string[]).includes(status)) {
			return fail(400, { statusError: 'Invalid status' });
		}

		const updated = await setBillStatus(user.id, params.id, status as UtilityBill['status']);
		if (!updated) {
			error(404, 'Bill not found');
		}

		locals.log.info({ billId: params.id, status }, 'bill status changed');
		return { statusChanged: status };
	},
	delete: async ({ params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const deleted = await deleteBill(user.id, params.id);
		if (!deleted) {
			error(404, 'Bill not found');
		}
		locals.log.info({ billId: params.id }, 'utility bill deleted');
		redirect(303, '/utilities/bills');
	}
};

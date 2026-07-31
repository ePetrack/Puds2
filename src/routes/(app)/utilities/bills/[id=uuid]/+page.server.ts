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
import {
	allocationContext,
	previewAllocation,
	saveAllocation,
	deleteAllocation,
	getAllocation,
	AllocationError
} from '$lib/server/services/bill-allocation';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import { BILL_STATUSES } from '$lib/schemas/utility';
import { allocationSchema, parseFixedPercentages } from '$lib/schemas/allocation';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import type { UtilityBill } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const bill = await getBill(params.id);
	if (!bill) {
		error(404, 'Bill not found');
	}

	const [history, allocation, context] = await Promise.all([
		billHistoryForAccount(bill.accountId),
		getAllocation(bill.id),
		allocationContext(bill.id)
	]);

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
		previousBills,
		allocation,
		allocationContext: context
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
	// Preview and save share one shape so the operator sees exactly the table that will
	// be persisted — ISO 50001 traceability starts with the reviewer seeing the arithmetic.
	previewAllocation: async ({ request, params }) => {
		const form = await request.formData();
		const parsed = allocationSchema.safeParse(formDataToObject(form));
		if (!parsed.success) {
			return fail(400, { allocationErrors: fieldErrors(parsed.error) });
		}

		try {
			const preview = await previewAllocation(
				params.id,
				parsed.data.method,
				parseFixedPercentages(form)
			);
			return { allocationPreview: preview, allocationNotes: parsed.data.notes ?? '' };
		} catch (err) {
			if (err instanceof AllocationError) {
				return fail(400, { allocationErrors: { [err.field]: err.message } });
			}
			throw err;
		}
	},

	saveAllocation: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const parsed = allocationSchema.safeParse(formDataToObject(form));
		if (!parsed.success) {
			return fail(400, { allocationErrors: fieldErrors(parsed.error) });
		}

		try {
			await saveAllocation(
				user.id,
				params.id,
				parsed.data.method,
				parsed.data.notes,
				parseFixedPercentages(form)
			);
		} catch (err) {
			if (err instanceof AllocationError) {
				return fail(400, { allocationErrors: { [err.field]: err.message } });
			}
			throw err;
		}

		locals.log.info({ billId: params.id, method: parsed.data.method }, 'bill allocation saved');
		return { allocationSaved: true };
	},

	deleteAllocation: async ({ params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const deleted = await deleteAllocation(user.id, params.id);
		if (!deleted) {
			return fail(404, { allocationErrors: { _form: 'No allocation to remove' } });
		}
		locals.log.info({ billId: params.id }, 'bill allocation removed');
		return { allocationDeleted: true };
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

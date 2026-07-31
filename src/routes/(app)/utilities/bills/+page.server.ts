import { listBills, deleteBill } from '$lib/server/services/utility-bills';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { UTILITY_TYPES, BILL_STATUSES } from '$lib/schemas/utility';
import type { UtilityAccount, UtilityBill } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const accountId = optionalUuid(url.searchParams.get('account')) ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const statusParam = url.searchParams.get('status') ?? '';

	const utilityType = (UTILITY_TYPES as readonly string[]).includes(typeParam)
		? (typeParam as UtilityAccount['utilityType'])
		: undefined;
	const status = (BILL_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as UtilityBill['status'])
		: undefined;

	const [bills, accounts] = await Promise.all([
		listBills({ page, accountId: accountId || undefined, utilityType, status }),
		listAccounts()
	]);

	return {
		bills,
		accountOptions: accounts.map((a) => ({
			id: a.id,
			label: `${a.accountNumber} · ${a.utilityType}`
		})),
		filters: { account: accountId, type: typeParam, status: statusParam }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Bill',
		logKey: 'billId',
		logMessage: 'utility bill deleted',
		remove: deleteBill
	})
};

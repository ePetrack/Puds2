import { listAccounts, deleteAccount } from '$lib/server/services/utility-accounts';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listClients } from '$lib/server/services/clients';
import { UTILITY_TYPES, ACCOUNT_STATUSES } from '$lib/schemas/utility';
import type { UtilityAccount } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const clientId = optionalUuid(url.searchParams.get('client')) ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const statusParam = url.searchParams.get('status') ?? '';

	const utilityType = (UTILITY_TYPES as readonly string[]).includes(typeParam)
		? (typeParam as UtilityAccount['utilityType'])
		: undefined;
	const status = (ACCOUNT_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as UtilityAccount['status'])
		: undefined;

	const [accounts, clientsPage] = await Promise.all([
		listAccounts({ clientId: clientId || undefined, utilityType, status }),
		listClients({ perPage: 100 })
	]);

	return {
		accounts,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { client: clientId, type: typeParam, status: statusParam }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Account',
		logKey: 'accountId',
		remove: deleteAccount
	})
};

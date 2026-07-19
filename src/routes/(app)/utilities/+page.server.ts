import { getUtilityOverview } from '$lib/server/services/utility-bills';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { listMeters } from '$lib/server/services/meters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [overview, accounts, meters] = await Promise.all([
		getUtilityOverview(),
		listAccounts(),
		listMeters()
	]);

	return {
		overview,
		accountStats: {
			total: accounts.length,
			active: accounts.filter((a) => a.status === 'active').length
		},
		meterStats: {
			total: meters.length,
			active: meters.filter((m) => m.status === 'active').length
		}
	};
};

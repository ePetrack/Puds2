import { listClients } from '$lib/server/services/clients';
import { listBuildings } from '$lib/server/services/buildings';
import { listRecentAudit } from '$lib/server/services/audit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [clientsPage, buildingsPage, recentActivity] = await Promise.all([
		listClients({ perPage: 1 }),
		listBuildings({ perPage: 1 }),
		listRecentAudit(10)
	]);

	return {
		stats: {
			clients: clientsPage.total,
			buildings: buildingsPage.total
		},
		recentActivity
	};
};

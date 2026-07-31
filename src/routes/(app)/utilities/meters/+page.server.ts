import { listMeters, deleteMeter } from '$lib/server/services/meters';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listBuildings } from '$lib/server/services/buildings';
import { UTILITY_TYPES, METER_STATUSES } from '$lib/schemas/utility';
import type { Meter } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const buildingId = optionalUuid(url.searchParams.get('building')) ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const statusParam = url.searchParams.get('status') ?? '';

	const utilityType = (UTILITY_TYPES as readonly string[]).includes(typeParam)
		? (typeParam as Meter['utilityType'])
		: undefined;
	const status = (METER_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as Meter['status'])
		: undefined;

	const [meters, buildingsPage] = await Promise.all([
		listMeters({ buildingId: buildingId || undefined, utilityType, status }),
		listBuildings({ perPage: 100 })
	]);

	return {
		meters,
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
		filters: { building: buildingId, type: typeParam, status: statusParam }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Meter',
		logKey: 'meterId',
		remove: deleteMeter
	})
};

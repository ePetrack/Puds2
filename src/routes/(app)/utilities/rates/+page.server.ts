import { listRateSchedules, deleteRateSchedule } from '$lib/server/services/rate-schedules';
import { deleteAction } from '$lib/server/actions';
import { listProviders } from '$lib/server/services/providers';
import { UTILITY_TYPES } from '$lib/schemas/utility';
import type { RateSchedule } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const providerId = url.searchParams.get('provider') ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const utilityType = (UTILITY_TYPES as readonly string[]).includes(typeParam)
		? (typeParam as RateSchedule['utilityType'])
		: undefined;

	const [rates, providers] = await Promise.all([
		listRateSchedules({ providerId: providerId || undefined, utilityType }),
		listProviders()
	]);

	return {
		rates,
		providerOptions: providers.map((p) => ({ id: p.id, name: p.name })),
		filters: { provider: providerId, type: typeParam }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Rate schedule',
		logKey: 'rateScheduleId',
		remove: deleteRateSchedule
	})
};

import {
	listReadings,
	deleteReading,
	monthlyUsageSeries
} from '$lib/server/services/energy-readings';
import { listMeters } from '$lib/server/services/meters';
import { deleteAction } from '$lib/server/actions';
import { optionalUuid } from '$lib/utils/uuid';
import { listBuildings } from '$lib/server/services/buildings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const meterId = optionalUuid(url.searchParams.get('meter')) ?? '';
	const buildingId = optionalUuid(url.searchParams.get('building')) ?? '';

	const [readings, series, meters, buildingsPage] = await Promise.all([
		listReadings({ page, meterId: meterId || undefined, buildingId: buildingId || undefined }),
		monthlyUsageSeries({ meterId: meterId || undefined, buildingId: buildingId || undefined }),
		listMeters(),
		listBuildings({ perPage: 100 })
	]);

	return {
		readings,
		series,
		meterOptions: meters.map((m) => ({
			id: m.id,
			label: `${m.meterNumber} · ${m.buildingName ?? ''}`
		})),
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
		filters: { meter: meterId, building: buildingId }
	};
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Reading',
		logKey: 'readingId',
		remove: deleteReading
	})
};

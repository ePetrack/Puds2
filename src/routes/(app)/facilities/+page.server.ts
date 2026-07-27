import { listCampuses } from '$lib/server/services/campuses';
import { listComplexes } from '$lib/server/services/complexes';
import { listBuildings } from '$lib/server/services/buildings';
import { listMeters } from '$lib/server/services/meters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Counts only — perPage 1 keeps the payload small; `total` comes from the
	// same paginated queries the list pages use.
	const [campuses, complexes, buildings, meters] = await Promise.all([
		listCampuses({ perPage: 1 }),
		listComplexes({ perPage: 1 }),
		listBuildings({ perPage: 1 }),
		listMeters()
	]);

	return {
		counts: {
			campuses: campuses.total,
			complexes: complexes.total,
			buildings: buildings.total,
			meters: meters.length,
			submeters: meters.filter((m) => m.isSubmeter).length,
			complexMeters: meters.filter((m) => m.complexId !== null).length
		}
	};
};

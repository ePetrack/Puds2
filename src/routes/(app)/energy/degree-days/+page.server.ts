import { listDegreeDays, listStationCoverage } from '$lib/server/services/degree-days';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const station = url.searchParams.get('station') ?? '';

	const [degreeDays, coverage] = await Promise.all([
		listDegreeDays({ page, station: station || undefined }),
		listStationCoverage()
	]);

	return { degreeDays, coverage, filters: { station } };
};

import { getAnalysisDataset } from '$lib/server/services/analysis';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { records: await getAnalysisDataset() };
};

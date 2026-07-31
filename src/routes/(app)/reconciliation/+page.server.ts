import { listReconcilableMeters, reconcileMeter } from '$lib/server/services/reconciliation';
import { optionalUuid } from '$lib/utils/uuid';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const meters = await listReconcilableMeters();

	const requested = optionalUuid(url.searchParams.get('meter')) ?? '';
	const selectedId = meters.some((m) => m.id === requested) ? requested : (meters[0]?.id ?? '');

	const monthsParam = Number(url.searchParams.get('months'));
	const monthsBack = [6, 12, 24, 36].includes(monthsParam) ? monthsParam : 12;

	const toleranceParam = Number(url.searchParams.get('tolerance'));
	const tolerancePct =
		Number.isFinite(toleranceParam) && toleranceParam >= 0 && toleranceParam <= 50
			? toleranceParam
			: 2;

	return {
		meters,
		selectedId,
		filters: { months: monthsBack, tolerance: tolerancePct },
		reconciliation: selectedId
			? ((await reconcileMeter(selectedId, monthsBack, tolerancePct)) ?? null)
			: null
	};
};

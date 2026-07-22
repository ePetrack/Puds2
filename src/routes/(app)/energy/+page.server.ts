import { fail } from '@sveltejs/kit';
import {
	listReadings,
	deleteReading,
	monthlyUsageSeries
} from '$lib/server/services/energy-readings';
import { listMeters } from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const meterId = url.searchParams.get('meter') ?? '';
	const buildingId = url.searchParams.get('building') ?? '';

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
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing reading id' });

		const deleted = await deleteReading(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Reading not found' });

		locals.log.info({ readingId: id }, 'energy reading deleted');
		return { deleted: true };
	}
};

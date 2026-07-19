import { fail } from '@sveltejs/kit';
import { listMeters, deleteMeter } from '$lib/server/services/meters';
import { listBuildings } from '$lib/server/services/buildings';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import { UTILITY_TYPES, METER_STATUSES } from '$lib/schemas/utility';
import type { Meter } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const buildingId = url.searchParams.get('building') ?? '';
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
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing meter id' });

		const deleted = await deleteMeter(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Meter not found' });

		locals.log.info({ meterId: id }, 'meter deleted');
		return { deleted: true };
	}
};

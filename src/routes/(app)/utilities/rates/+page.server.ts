import { fail } from '@sveltejs/kit';
import { listRateSchedules, deleteRateSchedule } from '$lib/server/services/rate-schedules';
import { listProviders } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
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
	delete: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { deleteError: 'Missing rate schedule id' });

		const deleted = await deleteRateSchedule(user.id, id);
		if (!deleted) return fail(404, { deleteError: 'Rate schedule not found' });

		locals.log.info({ rateScheduleId: id }, 'rate schedule deleted');
		return { deleted: true };
	}
};

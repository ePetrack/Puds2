import { fail, redirect } from '@sveltejs/kit';
import { rateScheduleSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createRateSchedule } from '$lib/server/services/rate-schedules';
import { listProviders } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const providers = await listProviders();
	return { providerOptions: providers.map((p) => ({ id: p.id, name: p.name })) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = rateScheduleSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const rate = await createRateSchedule(user.id, parsed.data);
		locals.log.info({ rateScheduleId: rate.id }, 'rate schedule created');
		redirect(303, '/utilities/rates');
	}
};

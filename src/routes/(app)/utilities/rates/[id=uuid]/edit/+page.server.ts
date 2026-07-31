import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { rateScheduleSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getRateSchedule, updateRateSchedule } from '$lib/server/services/rate-schedules';
import { listProviders } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [rate, providers] = await Promise.all([getRateSchedule(params.id), listProviders()]);
	if (!rate) {
		error(404, 'Rate schedule not found');
	}

	return {
		values: {
			providerId: rate.providerId,
			name: rate.name,
			utilityType: rate.utilityType,
			rateType: rate.rateType,
			energyRate: rate.energyRate ?? '',
			demandRate: rate.demandRate ?? '',
			fixedMonthlyCharge: rate.fixedMonthlyCharge ?? '',
			unit: rate.unit ?? '',
			effectiveDate: rate.effectiveDate ?? '',
			endDate: rate.endDate ?? '',
			notes: rate.notes ?? ''
		} as Record<string, string>,
		rateName: rate.name,
		providerOptions: providers.map((p) => ({ id: p.id, name: p.name }))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = rateScheduleSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateRateSchedule(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Rate schedule not found');
		}

		locals.log.info({ rateScheduleId: params.id }, 'rate schedule updated');
		redirect(303, '/utilities/rates');
	}
};

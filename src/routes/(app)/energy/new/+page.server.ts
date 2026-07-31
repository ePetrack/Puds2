import { fail, redirect } from '@sveltejs/kit';
import { energyReadingSchema } from '$lib/schemas/energy-reading';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createReading } from '$lib/server/services/energy-readings';
import { listMeters } from '$lib/server/services/meters';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const meters = await listMeters();
	return {
		meterOptions: meters.map((m) => ({
			id: m.id,
			label: `${m.meterNumber} · ${m.buildingName ?? ''} · ${m.utilityType}`
		})),
		preselectedMeter: url.searchParams.get('meter') ?? ''
	};
};

// Drizzle wraps the driver error; walk the cause chain for the unique violation
function isUniqueViolation(err: unknown): boolean {
	let e = err as { code?: string; message?: string; cause?: unknown } | undefined;
	while (e) {
		if (
			e.code === '23505' ||
			(typeof e.message === 'string' && e.message.includes('energy_readings_meter_date_idx'))
		) {
			return true;
		}
		e = e.cause as typeof e;
	}
	return false;
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = energyReadingSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		try {
			await createReading(user.id, parsed.data);
		} catch (err) {
			if (isUniqueViolation(err)) {
				return fail(409, {
					values,
					errors: { readingDate: 'A reading already exists for this meter and date' }
				});
			}
			throw err;
		}

		locals.log.info('energy reading created');
		redirect(303, '/energy');
	}
};

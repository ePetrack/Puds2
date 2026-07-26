import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { buildingSchema } from '$lib/schemas/building';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createBuilding } from '$lib/server/services/buildings';
import { listClients } from '$lib/server/services/clients';
import { listCampusOptions } from '$lib/server/services/campuses';
import { listComplexOptions } from '$lib/server/services/complexes';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [clientsPage, campusOptions, complexOptions] = await Promise.all([
		listClients({ perPage: 100 }),
		listCampusOptions(),
		listComplexOptions()
	]);
	return {
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		campusOptions,
		complexOptions,
		preselectedClient: url.searchParams.get('client') ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = buildingSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const building = await createBuilding(user.id, parsed.data);
		locals.log.info({ buildingId: building.id }, 'building created');
		redirect(303, `/buildings/${building.id}`);
	}
};

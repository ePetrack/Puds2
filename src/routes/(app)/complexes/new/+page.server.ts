import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { complexSchema } from '$lib/schemas/complex';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createComplex } from '$lib/server/services/complexes';
import { listClients } from '$lib/server/services/clients';
import { listCampusOptions } from '$lib/server/services/campuses';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [clientsPage, campusOptions] = await Promise.all([
		listClients({ perPage: 100 }),
		listCampusOptions()
	]);
	return {
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		campusOptions,
		preselectedCampus: url.searchParams.get('campus') ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = complexSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const complex = await createComplex(user.id, parsed.data);
		locals.log.info({ complexId: complex.id }, 'complex created');
		redirect(303, `/complexes/${complex.id}`);
	}
};

import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { complexSchema } from '$lib/schemas/complex';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getComplex, updateComplex } from '$lib/server/services/complexes';
import { listClients } from '$lib/server/services/clients';
import { listCampusOptions } from '$lib/server/services/campuses';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [complex, clientsPage, campusOptions] = await Promise.all([
		getComplex(params.id),
		listClients({ perPage: 100 }),
		listCampusOptions()
	]);
	if (!complex) {
		error(404, 'Complex not found');
	}

	return {
		values: {
			clientId: complex.clientId,
			campusId: complex.campusId ?? '',
			name: complex.name,
			code: complex.code ?? '',
			description: complex.description ?? '',
			notes: complex.notes ?? ''
		} as Record<string, string>,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		campusOptions,
		complexId: complex.id,
		complexName: complex.name
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = complexSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateComplex(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Complex not found');
		}

		locals.log.info({ complexId: params.id }, 'complex updated');
		redirect(303, `/complexes/${params.id}`);
	}
};

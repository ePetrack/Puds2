import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { campusSchema } from '$lib/schemas/campus';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getCampus, updateCampus } from '$lib/server/services/campuses';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [campus, clientsPage] = await Promise.all([
		getCampus(params.id),
		listClients({ perPage: 100 })
	]);
	if (!campus) {
		error(404, 'Campus not found');
	}

	return {
		values: {
			clientId: campus.clientId,
			name: campus.name,
			code: campus.code ?? '',
			address: campus.address ?? '',
			city: campus.city ?? '',
			state: campus.state ?? '',
			zip: campus.zip ?? '',
			notes: campus.notes ?? ''
		} as Record<string, string>,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		campusId: campus.id,
		campusName: campus.name
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = campusSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateCampus(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Campus not found');
		}

		locals.log.info({ campusId: params.id }, 'campus updated');
		redirect(303, `/campuses/${params.id}`);
	}
};

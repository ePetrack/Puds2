import { fail, redirect } from '@sveltejs/kit';
import { campusSchema } from '$lib/schemas/campus';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createCampus } from '$lib/server/services/campuses';
import { listClients } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const clientsPage = await listClients({ perPage: 100 });
	return {
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		preselectedClient: url.searchParams.get('client') ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = campusSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const campus = await createCampus(user.id, parsed.data);
		locals.log.info({ campusId: campus.id }, 'campus created');
		redirect(303, `/campuses/${campus.id}`);
	}
};

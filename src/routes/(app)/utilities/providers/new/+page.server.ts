import { fail, redirect } from '@sveltejs/kit';
import { providerSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createProvider } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const values = formDataToObject(form);
		const utilityTypes = form.getAll('utilityTypes').map(String);

		const parsed = providerSchema.safeParse({ ...values, utilityTypes });
		if (!parsed.success) {
			return fail(400, { values, utilityTypes, errors: fieldErrors(parsed.error) });
		}

		const provider = await createProvider(user.id, parsed.data);
		locals.log.info({ providerId: provider.id }, 'utility provider created');
		redirect(303, '/utilities/providers');
	}
};

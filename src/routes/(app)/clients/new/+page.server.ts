import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { clientSchema } from '$lib/schemas/client';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { createClient } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = clientSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const client = await createClient(user.id, parsed.data);
		locals.log.info({ clientId: client.id }, 'client created');
		redirect(303, `/clients/${client.id}`);
	}
};

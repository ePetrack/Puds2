import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { providerSchema } from '$lib/schemas/utility';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getProvider, updateProvider } from '$lib/server/services/providers';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const provider = await getProvider(params.id);
	if (!provider) {
		error(404, 'Provider not found');
	}

	return {
		values: {
			name: provider.name,
			accountManager: provider.accountManager ?? '',
			phone: provider.phone ?? '',
			email: provider.email ?? '',
			website: provider.website ?? '',
			address: provider.address ?? '',
			notes: provider.notes ?? ''
		} as Record<string, string>,
		selectedTypes: provider.utilityTypes ?? [],
		providerName: provider.name
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const values = formDataToObject(form);
		const utilityTypes = form.getAll('utilityTypes').map(String);

		const parsed = providerSchema.safeParse({ ...values, utilityTypes });
		if (!parsed.success) {
			return fail(400, { values, utilityTypes, errors: fieldErrors(parsed.error as z.ZodError) });
		}

		const updated = await updateProvider(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Provider not found');
		}

		locals.log.info({ providerId: params.id }, 'utility provider updated');
		redirect(303, '/utilities/providers');
	}
};

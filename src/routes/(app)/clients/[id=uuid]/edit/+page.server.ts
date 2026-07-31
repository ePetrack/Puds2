import { error, fail, redirect } from '@sveltejs/kit';
import { clientSchema } from '$lib/schemas/client';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getClient, updateClient } from '$lib/server/services/clients';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const client = await getClient(params.id);
	if (!client) {
		error(404, 'Client not found');
	}

	// Normalize to form-friendly string values
	return {
		values: {
			name: client.name,
			contactName: client.contactName ?? '',
			contactEmail: client.contactEmail ?? '',
			contactPhone: client.contactPhone ?? '',
			address: client.address ?? '',
			city: client.city ?? '',
			state: client.state ?? '',
			zip: client.zip ?? '',
			contractStartDate: client.contractStartDate ?? '',
			contractEndDate: client.contractEndDate ?? '',
			contractValue: client.contractValue ?? '',
			status: client.status,
			notes: client.notes ?? ''
		} as Record<string, string>,
		clientId: client.id,
		clientName: client.name
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = clientSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const updated = await updateClient(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Client not found');
		}

		locals.log.info({ clientId: params.id }, 'client updated');
		redirect(303, `/clients/${params.id}`);
	}
};

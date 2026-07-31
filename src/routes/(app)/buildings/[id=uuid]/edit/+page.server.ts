import { error, fail, redirect } from '@sveltejs/kit';
import { buildingSchema } from '$lib/schemas/building';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { getBuilding, updateBuilding } from '$lib/server/services/buildings';
import { listClients } from '$lib/server/services/clients';
import { listCampusOptions } from '$lib/server/services/campuses';
import { listComplexOptions } from '$lib/server/services/complexes';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [building, clientsPage, campusOptions, complexOptions] = await Promise.all([
		getBuilding(params.id),
		listClients({ perPage: 100 }),
		listCampusOptions(),
		listComplexOptions()
	]);
	if (!building) {
		error(404, 'Building not found');
	}

	return {
		values: {
			clientId: building.clientId,
			campusId: building.campusId ?? '',
			complexId: building.complexId ?? '',
			name: building.name,
			buildingType: building.buildingType ?? '',
			squareFootage: building.squareFootage?.toString() ?? '',
			yearBuilt: building.yearBuilt?.toString() ?? '',
			floors: building.floors?.toString() ?? '',
			occupancy: building.occupancy?.toString() ?? '',
			address: building.address ?? '',
			notes: building.notes ?? ''
		} as Record<string, string>,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		campusOptions,
		complexOptions,
		buildingId: building.id,
		buildingName: building.name
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const values = formDataToObject(await request.formData());

		const parsed = buildingSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const updated = await updateBuilding(user.id, params.id, parsed.data);
		if (!updated) {
			error(404, 'Building not found');
		}

		locals.log.info({ buildingId: params.id }, 'building updated');
		redirect(303, `/buildings/${params.id}`);
	}
};

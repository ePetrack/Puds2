import { fail } from '@sveltejs/kit';
import { documentMetaSchema, MAX_DOCUMENT_BYTES } from '$lib/schemas/document';
import { formDataToObject, fieldErrors } from '$lib/schemas/helpers';
import { listDocuments, createDocument, deleteDocument } from '$lib/server/services/documents';
import { deleteAction } from '$lib/server/actions';
import { listClients } from '$lib/server/services/clients';
import { listProjects } from '$lib/server/services/projects';
import { listBuildings } from '$lib/server/services/buildings';
import { requireRole, WRITE_ROLES } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') ?? undefined;

	const [documents, clientsPage, projectsPage, buildingsPage] = await Promise.all([
		listDocuments({ page, search }),
		listClients({ perPage: 100 }),
		listProjects({ perPage: 100 }),
		listBuildings({ perPage: 100 })
	]);

	return {
		documents,
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		projectOptions: projectsPage.items.map((p) => ({ id: p.id, name: p.name })),
		buildingOptions: buildingsPage.items.map((b) => ({ id: b.id, name: b.name })),
		filters: { search: search ?? '' }
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const user = requireRole(locals.user, WRITE_ROLES);
		const form = await request.formData();
		const file = form.get('file');
		const values = formDataToObject(form);

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { values, errors: { file: 'Choose a file to upload' } });
		}
		if (file.size > MAX_DOCUMENT_BYTES) {
			return fail(400, { values, errors: { file: 'File is too large (25 MB max)' } });
		}

		const parsed = documentMetaSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: fieldErrors(parsed.error) });
		}

		const doc = await createDocument(user.id, parsed.data, {
			name: file.name,
			type: file.type,
			bytes: new Uint8Array(await file.arrayBuffer())
		});

		locals.log.info({ documentId: doc.id, sizeBytes: doc.sizeBytes }, 'document uploaded');
		return { uploaded: doc.title };
	},
	delete: deleteAction({
		entity: 'Document',
		logKey: 'documentId',
		remove: deleteDocument
	})
};

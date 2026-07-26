import { error } from '@sveltejs/kit';
import { getDocument, openDocumentStream } from '$lib/server/services/documents';
import type { RequestHandler } from './$types';

// Auth is enforced by the (app) group guard in hooks.server.ts
export const GET: RequestHandler = async ({ params }) => {
	const doc = await getDocument(params.id);
	if (!doc) {
		error(404, 'Document not found');
	}

	const file = await openDocumentStream(doc);
	if (!file) {
		error(410, 'The stored file is no longer available');
	}

	// Always attachment: uploaded content must never execute in the app's origin
	const safeName = doc.fileName.replace(/[^\w.\- ]/g, '_');
	return new Response(file.stream, {
		headers: {
			'Content-Type': doc.mimeType,
			'Content-Length': String(file.size),
			'Content-Disposition': `attachment; filename="${safeName}"`,
			'X-Content-Type-Options': 'nosniff'
		}
	});
};

import { createReadStream } from 'node:fs';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { documents, clients, projects, buildings, user, type Document } from '../db/schema';
import { recordAudit } from './audit';
import type { DocumentMetaInput } from '$lib/schemas/document';
import type { Paginated } from './clients';

/** Local filesystem storage root; swap for object storage in a later milestone. */
function uploadDir(): string {
	return resolve(process.env.UPLOAD_DIR ?? 'uploads');
}

export type DocumentWithRefs = Document & {
	clientName: string | null;
	projectName: string | null;
	buildingName: string | null;
	uploaderName: string | null;
};

const docSelect = {
	doc: documents,
	clientName: clients.name,
	projectName: projects.name,
	buildingName: buildings.name,
	uploaderName: user.name
};

function withRefs(r: {
	doc: Document;
	clientName: string | null;
	projectName: string | null;
	buildingName: string | null;
	uploaderName: string | null;
}): DocumentWithRefs {
	return {
		...r.doc,
		clientName: r.clientName,
		projectName: r.projectName,
		buildingName: r.buildingName,
		uploaderName: r.uploaderName
	};
}

export interface DocumentListParams {
	page?: number;
	perPage?: number;
	search?: string;
	clientId?: string;
}

export async function listDocuments(
	params: DocumentListParams = {}
): Promise<Paginated<DocumentWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.search) conditions.push(ilike(documents.title, `%${params.search}%`));
	if (params.clientId) conditions.push(eq(documents.clientId, params.clientId));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [{ value: total }]] = await Promise.all([
		db
			.select(docSelect)
			.from(documents)
			.leftJoin(clients, eq(documents.clientId, clients.id))
			.leftJoin(projects, eq(documents.projectId, projects.id))
			.leftJoin(buildings, eq(documents.buildingId, buildings.id))
			.leftJoin(user, eq(documents.uploadedBy, user.id))
			.where(where)
			.orderBy(desc(documents.createdAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db.select({ value: count() }).from(documents).where(where)
	]);

	return {
		items: rows.map(withRefs),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function getDocument(id: string): Promise<Document | undefined> {
	return db.query.documents.findFirst({ where: eq(documents.id, id) });
}

/**
 * Persist an uploaded file and its metadata. The stored name is a fresh UUID —
 * user-supplied file names never touch the filesystem path.
 */
export async function createDocument(
	actorId: string,
	meta: DocumentMetaInput,
	file: { name: string; type: string; bytes: Uint8Array }
): Promise<Document> {
	const storedName = crypto.randomUUID();
	await mkdir(uploadDir(), { recursive: true });
	await writeFile(join(uploadDir(), storedName), file.bytes);

	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(documents)
				.values({
					title: meta.title,
					description: meta.description ?? null,
					fileName: file.name,
					storedName,
					mimeType: file.type || 'application/octet-stream',
					sizeBytes: file.bytes.byteLength,
					clientId: meta.clientId ?? null,
					projectId: meta.projectId ?? null,
					buildingId: meta.buildingId ?? null,
					uploadedBy: actorId
				})
				.returning();
			await recordAudit(tx, {
				actorId,
				entity: 'document',
				entityId: created.id,
				action: 'create',
				changes: {
					title: { from: null, to: meta.title },
					fileName: { from: null, to: file.name },
					sizeBytes: { from: null, to: file.bytes.byteLength }
				}
			});
			return created;
		});
	} catch (err) {
		// Roll back the orphaned file if the DB write failed
		await unlink(join(uploadDir(), storedName)).catch(() => {});
		throw err;
	}
}

/** Web ReadableStream of the stored file, for streaming download responses. */
export async function openDocumentStream(
	doc: Document
): Promise<{ stream: ReadableStream; size: number } | undefined> {
	const path = join(uploadDir(), doc.storedName);
	try {
		const info = await stat(path);
		return {
			stream: Readable.toWeb(createReadStream(path)) as ReadableStream,
			size: info.size
		};
	} catch {
		return undefined;
	}
}

export async function deleteDocument(actorId: string, id: string): Promise<boolean> {
	const deleted = await db.transaction(async (tx) => {
		const [row] = await tx.delete(documents).where(eq(documents.id, id)).returning();
		if (!row) return undefined;
		await recordAudit(tx, {
			actorId,
			entity: 'document',
			entityId: id,
			action: 'delete',
			changes: { title: { from: row.title, to: null } }
		});
		return row;
	});
	if (!deleted) return false;
	await unlink(join(uploadDir(), deleted.storedName)).catch(() => {});
	return true;
}

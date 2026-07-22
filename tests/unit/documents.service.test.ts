import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	createDocument,
	getDocument,
	listDocuments,
	openDocumentStream,
	deleteDocument
} from '$lib/server/services/documents';
import { ensureTestActor, TEST_ACTOR } from './setup';

let dir: string;

beforeAll(async () => {
	await ensureTestActor();
	dir = await mkdtemp(join(tmpdir(), 'puds-docs-'));
	process.env.UPLOAD_DIR = dir;
});

beforeEach(async () => {
	await db.execute(sql`TRUNCATE TABLE audit_log, documents CASCADE`);
});

const bytes = new TextEncoder().encode('hello, energy world');

describe('documents service', () => {
	it('stores the file under a generated name and records metadata', async () => {
		const doc = await createDocument(
			TEST_ACTOR,
			{ title: 'Audit Report' },
			{ name: 'audit ../../etc/passwd.pdf', type: 'application/pdf', bytes }
		);

		expect(doc.sizeBytes).toBe(bytes.byteLength);
		expect(doc.fileName).toBe('audit ../../etc/passwd.pdf');
		// Stored name is a UUID, never derived from user input
		expect(doc.storedName).toMatch(/^[0-9a-f-]{36}$/);
		expect(existsSync(join(dir, doc.storedName))).toBe(true);

		const list = await listDocuments();
		expect(list.total).toBe(1);
		expect(list.items[0].uploaderName).toBe('Test Actor');
	});

	it('streams the stored file back', async () => {
		const doc = await createDocument(
			TEST_ACTOR,
			{ title: 'Readme' },
			{ name: 'readme.txt', type: 'text/plain', bytes }
		);

		const file = await openDocumentStream((await getDocument(doc.id))!);
		expect(file?.size).toBe(bytes.byteLength);
		const text = await new Response(file!.stream).text();
		expect(text).toBe('hello, energy world');
	});

	it('deletes the row and the file', async () => {
		const doc = await createDocument(
			TEST_ACTOR,
			{ title: 'Temp' },
			{ name: 't.txt', type: 'text/plain', bytes }
		);
		expect(await deleteDocument(TEST_ACTOR, doc.id)).toBe(true);
		expect(await getDocument(doc.id)).toBeUndefined();
		expect(existsSync(join(dir, doc.storedName))).toBe(false);
	});

	it('filters by title search', async () => {
		await createDocument(
			TEST_ACTOR,
			{ title: 'Energy Audit 2026' },
			{ name: 'a.pdf', type: 'application/pdf', bytes }
		);
		await createDocument(
			TEST_ACTOR,
			{ title: 'Floor Plans' },
			{ name: 'b.pdf', type: 'application/pdf', bytes }
		);

		const found = await listDocuments({ search: 'audit' });
		expect(found.total).toBe(1);
		expect(found.items[0].title).toBe('Energy Audit 2026');
	});
});

import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

/** Wipe domain tables between tests. Auth tables are left alone. */
export async function resetDomainTables(): Promise<void> {
	await db.execute(sql`TRUNCATE TABLE audit_log, campuses, complexes, buildings, clients CASCADE`);
}

export const TEST_ACTOR = 'test-actor';

/** Ensure a user row exists to satisfy the audit_log actor FK. */
export async function ensureTestActor(): Promise<void> {
	await db.execute(sql`
		INSERT INTO "user" (id, name, email, email_verified, role)
		VALUES (${TEST_ACTOR}, 'Test Actor', 'actor@test.local', true, 'consultant')
		ON CONFLICT (id) DO NOTHING
	`);
}

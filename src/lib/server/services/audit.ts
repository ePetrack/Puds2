import { desc, eq } from 'drizzle-orm';
import { auditLog, user, type AuditLogEntry } from '../db/schema';
import { db, type Database } from '../db';

type AuditAction = 'create' | 'update' | 'delete';

/**
 * Record an entity mutation. Accepts the db handle (or a transaction) so callers
 * can make the audit entry atomic with the change itself.
 */
export async function recordAudit(
	tx: Pick<Database, 'insert'>,
	params: {
		actorId: string | null;
		entity: string;
		entityId: string;
		action: AuditAction;
		changes?: Record<string, unknown>;
	}
): Promise<void> {
	await tx.insert(auditLog).values({
		actorId: params.actorId,
		entity: params.entity,
		entityId: params.entityId,
		action: params.action,
		changes: params.changes ?? null
	});
}

export type AuditEntryWithActor = AuditLogEntry & { actorName: string | null };

export async function listRecentAudit(limit = 10): Promise<AuditEntryWithActor[]> {
	const rows = await db
		.select({ entry: auditLog, actorName: user.name })
		.from(auditLog)
		.leftJoin(user, eq(auditLog.actorId, user.id))
		.orderBy(desc(auditLog.createdAt))
		.limit(limit);
	return rows.map((r) => ({ ...r.entry, actorName: r.actorName }));
}

/** Shallow diff of two records, listing only changed fields as { from, to }. */
export function diffRecords(
	before: Record<string, unknown>,
	after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
	const diff: Record<string, { from: unknown; to: unknown }> = {};
	for (const key of Object.keys(after)) {
		if (key === 'updatedAt' || key === 'createdAt') continue;
		const a = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
		const b = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key];
		if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) {
			diff[key] = { from: a ?? null, to: b ?? null };
		}
	}
	return diff;
}

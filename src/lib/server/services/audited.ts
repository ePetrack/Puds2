import { eq, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { recordAudit, diffRecords } from './audit';

/**
 * The transaction-plus-audit ceremony every CRUD service repeats.
 *
 * Thirteen services opened a transaction, wrote the row, computed a diff and recorded an
 * audit entry — the same handful of lines each time, differing only in table and entity name.
 * The repetition was a liability rather than mere noise: the invariant that **every mutation
 * writes `audit_log` in the same transaction as the change** was restated thirteen times and
 * could therefore be got wrong in one of them.
 *
 * Each service still owns its `toRow`, its filters and its business rules; only the ceremony
 * moves here.
 *
 * The signatures are generic over the table, so callers keep full type checking on the values
 * they pass and the row they get back. Drizzle's builder generics don't survive being made
 * generic over an arbitrary `PgTable`, so there are casts *inside* — deliberately confined to
 * this one reviewed file rather than spread across thirteen services.
 */

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any -- see the note above: internal only. */

/** Insert a row and record its creation atomically. */
export async function auditedInsert<T extends PgTable>(
	actorId: string,
	table: T,
	entity: string,
	values: InferInsertModel<T>
): Promise<InferSelectModel<T>> {
	return db.transaction(async (tx) => {
		const [created] = await (tx.insert(table) as any).values(values).returning();
		await recordAudit(tx, {
			actorId,
			entity,
			entityId: created.id,
			action: 'create',
			changes: diffRecords({}, values as Row)
		});
		return created;
	});
}

/**
 * Update a row and record what changed. Returns `undefined` when the row doesn't exist, which
 * every caller already treats as "not found" — and no audit entry is written for a write that
 * never happened.
 */
export async function auditedUpdate<T extends PgTable>(
	actorId: string,
	table: T,
	idColumn: PgColumn,
	entity: string,
	id: string,
	values: InferInsertModel<T>
): Promise<InferSelectModel<T> | undefined> {
	return db.transaction(async (tx) => {
		const [before] = await (tx.select() as any).from(table).where(eq(idColumn, id));
		if (!before) return undefined;

		const [updated] = await (tx.update(table) as any)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(idColumn, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity,
			entityId: id,
			action: 'update',
			changes: diffRecords(before, values as Row)
		});
		return updated;
	});
}

/**
 * Delete a row and record it. `describe` builds the change payload from the deleted row —
 * usually its name, so the log says what was removed rather than only that something was.
 */
export async function auditedDelete<T extends PgTable>(
	actorId: string,
	table: T,
	idColumn: PgColumn,
	entity: string,
	id: string,
	describe: (deleted: InferSelectModel<T>) => Record<string, unknown>
): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [deleted] = await (tx.delete(table) as any).where(eq(idColumn, id)).returning();
		if (!deleted) return false;
		await recordAudit(tx, {
			actorId,
			entity,
			entityId: id,
			action: 'delete',
			changes: describe(deleted)
		});
		return true;
	});
}

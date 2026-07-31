import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { diffRecords, recordAudit, listRecentAudit } from '$lib/server/services/audit';
import { ensureTestActor, TEST_ACTOR } from './setup';

/**
 * `diffRecords` is the compliance backbone — every mutation in the app records its change
 * through it — and it had no tests at all. What it *omits* matters as much as what it keeps:
 * an audit trail that quietly drops a field is worse than none, because it looks complete.
 */

beforeAll(async () => {
	await ensureTestActor();
});

describe('diffRecords', () => {
	it('reports only the fields that actually changed', () => {
		const diff = diffRecords({ name: 'Old', status: 'active' }, { name: 'New', status: 'active' });
		expect(diff).toEqual({ name: { from: 'Old', to: 'New' } });
	});

	it('returns nothing when a write changed nothing', () => {
		expect(diffRecords({ name: 'Same' }, { name: 'Same' })).toEqual({});
	});

	it('records a newly set field, using null for the absent side', () => {
		expect(diffRecords({}, { name: 'First' })).toEqual({ name: { from: null, to: 'First' } });
	});

	it('records a cleared field', () => {
		expect(diffRecords({ notes: 'something' }, { notes: null })).toEqual({
			notes: { from: 'something', to: null }
		});
	});

	it('treats undefined and null as the same absence', () => {
		// `toRow` helpers normalise empty form fields to null while a fresh object has them
		// undefined; reporting that as a change would fill the log with phantom edits.
		expect(diffRecords({ notes: undefined }, { notes: null })).toEqual({});
	});

	it('ignores keys missing from the new record rather than reporting deletions', () => {
		// Callers pass a partial `toRow(...)`, so a key absent from `after` means "not part of
		// this write" — not "removed".
		expect(diffRecords({ name: 'A', internalOnly: 'x' }, { name: 'A' })).toEqual({});
	});

	it('never reports createdAt or updatedAt', () => {
		// Every update bumps updatedAt; logging it would add noise to literally every entry.
		const diff = diffRecords(
			{ name: 'A', createdAt: new Date(0), updatedAt: new Date(0) },
			{ name: 'A', createdAt: new Date(1), updatedAt: new Date(1) }
		);
		expect(diff).toEqual({});
	});

	it('compares dates by value, not identity', () => {
		const same = diffRecords({ startDate: new Date(5) }, { startDate: new Date(5) });
		expect(same).toEqual({});

		const changed = diffRecords({ startDate: new Date(5) }, { startDate: new Date(6) });
		expect(changed.startDate.from).toBe(new Date(5).toISOString());
		expect(changed.startDate.to).toBe(new Date(6).toISOString());
	});

	it('detects a change inside an array or object value', () => {
		// `utilityTypes` is a Postgres array and `basis` is jsonb — a shallow `!==` would call
		// every write a change, and a naive equality would call none.
		expect(diffRecords({ types: ['a'] }, { types: ['a'] })).toEqual({});
		expect(diffRecords({ types: ['a'] }, { types: ['a', 'b'] })).toEqual({
			types: { from: ['a'], to: ['a', 'b'] }
		});
	});

	it('distinguishes a numeric string from a number', () => {
		// Numerics come back from Postgres as strings; conflating them would hide real edits.
		expect(diffRecords({ usage: '100' }, { usage: 100 })).toEqual({
			usage: { from: '100', to: 100 }
		});
	});
});

describe('recordAudit', () => {
	beforeEach(async () => {
		await db.execute(sql`TRUNCATE TABLE audit_log CASCADE`);
	});

	it('persists the actor, entity, action and changes', async () => {
		await recordAudit(db, {
			actorId: TEST_ACTOR,
			entity: 'client',
			entityId: 'abc',
			action: 'create',
			changes: { name: { from: null, to: 'Acme' } }
		});

		const [row] = await db.select().from(auditLog).where(eq(auditLog.entity, 'client'));
		expect(row).toMatchObject({ actorId: TEST_ACTOR, entityId: 'abc', action: 'create' });
		expect(row.changes).toEqual({ name: { from: null, to: 'Acme' } });
	});

	it('accepts a null actor, so a system-initiated change is still recorded', async () => {
		await recordAudit(db, {
			actorId: null,
			entity: 'client',
			entityId: 'sys',
			action: 'update'
		});

		const [row] = await db.select().from(auditLog).where(eq(auditLog.entityId, 'sys'));
		expect(row.actorId).toBeNull();
		expect(row.changes).toBeNull();
	});
});

describe('listRecentAudit', () => {
	beforeEach(async () => {
		await db.execute(sql`TRUNCATE TABLE audit_log CASCADE`);
	});

	it('returns newest first and resolves the actor name', async () => {
		for (const entityId of ['first', 'second', 'third']) {
			await recordAudit(db, {
				actorId: TEST_ACTOR,
				entity: 'client',
				entityId,
				action: 'create'
			});
		}

		const recent = await listRecentAudit(2);
		expect(recent).toHaveLength(2);
		expect(recent[0].entityId).toBe('third');
		expect(recent[0].actorName).not.toBeNull();
	});

	it('still returns the entry when the actor has been deleted', async () => {
		// The FK is `set null` on delete — losing the user must not lose the audit row.
		await recordAudit(db, {
			actorId: null,
			entity: 'client',
			entityId: 'orphan',
			action: 'delete'
		});
		const recent = await listRecentAudit(10);
		expect(recent.map((r) => r.entityId)).toContain('orphan');
		expect(recent[0].actorName).toBeNull();
	});
});

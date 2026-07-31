import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createProvider } from '$lib/server/services/providers';
import { createRateSchedule } from '$lib/server/services/rate-schedules';
import {
	createAccount,
	updateAccount,
	deleteAccount,
	getAccount,
	listAccounts,
	findAccountByNumber
} from '$lib/server/services/utility-accounts';
import { ensureTestActor, TEST_ACTOR } from './setup';

let clientId: string;
let otherClientId: string;
let providerId: string;
let rateScheduleId: string;

const input = (overrides: Record<string, unknown> = {}) =>
	({
		clientId,
		providerId,
		accountNumber: 'ACCT-1000',
		utilityType: 'electricity',
		status: 'active',
		...overrides
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) as any;

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, utility_accounts, rate_schedules, utility_providers, clients CASCADE`
	);
	clientId = (await createClient(TEST_ACTOR, { name: 'State University', status: 'active' })).id;
	otherClientId = (await createClient(TEST_ACTOR, { name: 'Tech College', status: 'active' })).id;
	providerId = // eslint-disable-next-line @typescript-eslint/no-explicit-any
		(await createProvider(TEST_ACTOR, { name: 'Grid Power', utilityTypes: ['electricity'] } as any))
			.id;
	rateScheduleId = (
		await createRateSchedule(TEST_ACTOR, {
			providerId,
			name: 'Standard Commercial',
			utilityType: 'electricity',
			rateType: 'flat'
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)
	).id;
});

describe('createAccount', () => {
	it('stores the account and audits it', async () => {
		const created = await createAccount(TEST_ACTOR, input());

		expect(created.accountNumber).toBe('ACCT-1000');
		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'utility_account'), eq(auditLog.entityId, created.id)));
		expect(audits).toHaveLength(1);
		expect(audits[0].action).toBe('create');
	});

	it('leaves an unattached rate schedule null', async () => {
		// An account without a tariff on file is a normal, reportable state — not an error and
		// not something to guess at.
		const created = await createAccount(TEST_ACTOR, input());
		expect(created.rateScheduleId).toBeNull();
	});
});

describe('getAccount', () => {
	it('resolves the client, provider and rate schedule names', async () => {
		const created = await createAccount(TEST_ACTOR, input({ rateScheduleId }));
		const found = await getAccount(created.id);

		expect(found).toMatchObject({
			clientName: 'State University',
			providerName: 'Grid Power',
			rateScheduleName: 'Standard Commercial'
		});
	});

	it('returns the account with a null rate-schedule name when none is attached', async () => {
		// A left join must not drop the row just because the optional reference is absent.
		const created = await createAccount(TEST_ACTOR, input());
		const found = await getAccount(created.id);
		expect(found).toBeDefined();
		expect(found!.rateScheduleName).toBeNull();
	});

	it('returns undefined for an unknown id', async () => {
		expect(await getAccount('00000000-0000-4000-8000-000000000000')).toBeUndefined();
	});
});

describe('findAccountByNumber', () => {
	it('finds an account by its number — the key the CSV importer matches on', async () => {
		await createAccount(TEST_ACTOR, input({ accountNumber: 'ACCT-XYZ' }));
		expect((await findAccountByNumber('ACCT-XYZ'))!.accountNumber).toBe('ACCT-XYZ');
	});

	it('is exact, not fuzzy', async () => {
		await createAccount(TEST_ACTOR, input({ accountNumber: 'ACCT-XYZ' }));
		expect(await findAccountByNumber('acct-xyz')).toBeUndefined();
		expect(await findAccountByNumber('ACCT-XY')).toBeUndefined();
	});
});

describe('listAccounts', () => {
	beforeEach(async () => {
		await createAccount(TEST_ACTOR, input({ accountNumber: 'A-1' }));
		await createAccount(
			TEST_ACTOR,
			input({ accountNumber: 'A-2', utilityType: 'water', status: 'closed' })
		);
		await createAccount(TEST_ACTOR, input({ accountNumber: 'B-1', clientId: otherClientId }));
	});

	it('returns every account when unfiltered', async () => {
		expect(await listAccounts()).toHaveLength(3);
	});

	it('filters by client', async () => {
		const rows = await listAccounts({ clientId: otherClientId });
		expect(rows.map((a) => a.accountNumber)).toEqual(['B-1']);
	});

	it('filters by utility type and status', async () => {
		expect((await listAccounts({ utilityType: 'water' })).map((a) => a.accountNumber)).toEqual([
			'A-2'
		]);
		expect((await listAccounts({ status: 'closed' })).map((a) => a.accountNumber)).toEqual(['A-2']);
	});

	it('combines filters rather than widening', async () => {
		expect(await listAccounts({ clientId: otherClientId, status: 'closed' })).toHaveLength(0);
	});
});

describe('updateAccount and deleteAccount', () => {
	it('records only the changed field', async () => {
		const created = await createAccount(TEST_ACTOR, input());
		await updateAccount(TEST_ACTOR, created.id, input({ status: 'closed' }));

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'utility_account'), eq(auditLog.entityId, created.id)));
		const update = audits.find((a) => a.action === 'update')!;
		expect(update.changes).toEqual({ status: { from: 'active', to: 'closed' } });
	});

	it('deletes, then reports false on a second attempt', async () => {
		const created = await createAccount(TEST_ACTOR, input());
		expect(await deleteAccount(TEST_ACTOR, created.id)).toBe(true);
		expect(await deleteAccount(TEST_ACTOR, created.id)).toBe(false);
	});
});

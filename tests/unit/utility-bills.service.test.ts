import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { createClient } from '$lib/server/services/clients';
import { createProvider } from '$lib/server/services/providers';
import { createAccount } from '$lib/server/services/utility-accounts';
import {
	createBill,
	listBills,
	setBillStatus,
	importBillsCSV,
	billHistoryForAccount
} from '$lib/server/services/utility-bills';
import { ensureTestActor, TEST_ACTOR } from './setup';

let accountId: string;

async function resetUtilityTables() {
	await db.execute(
		sql`TRUNCATE TABLE audit_log, utility_bills, meters, utility_accounts, rate_schedules, utility_providers, buildings, clients CASCADE`
	);
}

const billInput = {
	statementDate: '2026-07-05',
	periodStart: '2026-06-01',
	periodEnd: '2026-06-30',
	usage: 42500,
	unit: 'kWh',
	totalCost: 7613.4,
	status: 'pending' as const
};

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(async () => {
	await resetUtilityTables();
	const client = await createClient(TEST_ACTOR, { name: 'Bill U', status: 'active' as const });
	const provider = await createProvider(TEST_ACTOR, { name: 'Test Power', utilityTypes: [] });
	const account = await createAccount(TEST_ACTOR, {
		clientId: client.id,
		providerId: provider.id,
		accountNumber: 'ACCT-001',
		utilityType: 'electricity',
		status: 'active'
	});
	accountId = account.id;
});

describe('utility bills service', () => {
	it('creates a bill with an audit entry', async () => {
		const bill = await createBill(TEST_ACTOR, { ...billInput, accountId });
		expect(Number(bill.totalCost)).toBeCloseTo(7613.4);

		const audits = await db
			.select()
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'utility_bill'), eq(auditLog.entityId, bill.id)));
		expect(audits).toHaveLength(1);
		expect(audits[0].actorId).toBe(TEST_ACTOR);
	});

	it('lists bills with account refs and status filter', async () => {
		await createBill(TEST_ACTOR, { ...billInput, accountId });
		await createBill(TEST_ACTOR, {
			...billInput,
			accountId,
			periodStart: '2026-07-01',
			periodEnd: '2026-07-31',
			status: 'paid'
		});

		const all = await listBills();
		expect(all.total).toBe(2);
		expect(all.items[0].accountNumber).toBe('ACCT-001');

		const pending = await listBills({ status: 'pending' });
		expect(pending.total).toBe(1);

		const byType = await listBills({ utilityType: 'natural_gas' });
		expect(byType.total).toBe(0);
	});

	it('marks a bill paid and stamps the payment date', async () => {
		const bill = await createBill(TEST_ACTOR, { ...billInput, accountId });
		const updated = await setBillStatus(TEST_ACTOR, bill.id, 'paid');
		expect(updated?.status).toBe('paid');
		expect(updated?.paymentDate).toBeTruthy();
	});

	it('imports valid CSV rows and reports invalid ones with line numbers', async () => {
		const csv = [
			'account_number,statement_date,period_start,period_end,usage,total_cost,status',
			'ACCT-001,2026-07-05,2026-06-01,2026-06-30,42500,7613.40,pending',
			'NO-SUCH-ACCT,2026-07-05,2026-06-01,2026-06-30,100,50,pending',
			'ACCT-001,2026-08-05,2026-07-31,2026-07-01,100,50,pending',
			'ACCT-001,2026-08-05,2026-07-01,2026-07-31,51200,9071.48,paid'
		].join('\n');

		const result = await importBillsCSV(TEST_ACTOR, csv);
		expect(result.imported).toBe(2);
		expect(result.failures).toHaveLength(2);
		expect(result.failures[0].line).toBe(3); // unknown account
		expect(result.failures[1].line).toBe(4); // inverted period

		const history = await billHistoryForAccount(accountId);
		expect(history).toHaveLength(2);
		expect(history[0].status).toBe('paid'); // newest first
	});

	it('handles quoted CSV fields', async () => {
		const csv = [
			'account_number,statement_date,period_start,period_end,total_cost,notes',
			'ACCT-001,2026-07-05,2026-06-01,2026-06-30,100.50,"Includes rider, zone 2"'
		].join('\n');

		const result = await importBillsCSV(TEST_ACTOR, csv);
		expect(result.imported).toBe(1);
		const [bill] = await billHistoryForAccount(accountId);
		expect(bill.notes).toBe('Includes rider, zone 2');
	});
});

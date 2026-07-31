import { and, count, desc, eq, gte, type SQL } from 'drizzle-orm';
import { db } from '../db';
import {
	utilityBills,
	utilityAccounts,
	utilityProviders,
	meters,
	clients,
	type UtilityBill,
	type UtilityAccount
} from '../db/schema';
import { recordAudit } from './audit';
import { auditedInsert, auditedUpdate, auditedDelete } from './audited';
import { parseCSV } from '../csv';
import { utilityBillSchema, type UtilityBillInput, BILL_STATUSES } from '$lib/schemas/utility';
import type { Paginated } from './pagination';

export type BillWithRefs = UtilityBill & {
	accountNumber: string | null;
	accountUtilityType: UtilityAccount['utilityType'] | null;
	clientName: string | null;
	providerName: string | null;
	meterNumber: string | null;
};

function toRow(input: UtilityBillInput) {
	const money = (v: number | undefined) => (v !== undefined ? String(v) : null);
	return {
		accountId: input.accountId,
		meterId: input.meterId ?? null,
		statementDate: input.statementDate,
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		dueDate: input.dueDate ?? null,
		usage: input.usage !== undefined ? String(input.usage) : null,
		unit: input.unit ?? null,
		demandKw: input.demandKw !== undefined ? String(input.demandKw) : null,
		energyCharge: money(input.energyCharge),
		demandCharge: money(input.demandCharge),
		fixedCharge: money(input.fixedCharge),
		taxesFees: money(input.taxesFees),
		otherCharges: money(input.otherCharges),
		totalCost: String(input.totalCost),
		status: input.status,
		paymentDate: input.paymentDate ?? null,
		readingType: input.readingType ?? null,
		notes: input.notes ?? null
	};
}

const billSelect = {
	bill: utilityBills,
	accountNumber: utilityAccounts.accountNumber,
	accountUtilityType: utilityAccounts.utilityType,
	clientName: clients.name,
	providerName: utilityProviders.name,
	meterNumber: meters.meterNumber
};

function withRefs(r: {
	bill: UtilityBill;
	accountNumber: string | null;
	accountUtilityType: UtilityAccount['utilityType'] | null;
	clientName: string | null;
	providerName: string | null;
	meterNumber: string | null;
}): BillWithRefs {
	return {
		...r.bill,
		accountNumber: r.accountNumber,
		accountUtilityType: r.accountUtilityType,
		clientName: r.clientName,
		providerName: r.providerName,
		meterNumber: r.meterNumber
	};
}

export interface BillListParams {
	page?: number;
	perPage?: number;
	accountId?: string;
	status?: UtilityBill['status'];
	utilityType?: UtilityAccount['utilityType'];
}

export async function listBills(params: BillListParams = {}): Promise<Paginated<BillWithRefs>> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));

	const conditions: SQL[] = [];
	if (params.accountId) conditions.push(eq(utilityBills.accountId, params.accountId));
	if (params.status) conditions.push(eq(utilityBills.status, params.status));
	if (params.utilityType) conditions.push(eq(utilityAccounts.utilityType, params.utilityType));
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const base = () =>
		db
			.select(billSelect)
			.from(utilityBills)
			.leftJoin(utilityAccounts, eq(utilityBills.accountId, utilityAccounts.id))
			.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
			.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
			.leftJoin(meters, eq(utilityBills.meterId, meters.id));

	const [rows, [{ value: total }]] = await Promise.all([
		base()
			.where(where)
			.orderBy(desc(utilityBills.periodEnd))
			.limit(perPage)
			.offset((page - 1) * perPage),
		db
			.select({ value: count() })
			.from(utilityBills)
			.leftJoin(utilityAccounts, eq(utilityBills.accountId, utilityAccounts.id))
			.where(where)
	]);

	return {
		items: rows.map(withRefs),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function getBill(id: string): Promise<BillWithRefs | undefined> {
	const rows = await db
		.select(billSelect)
		.from(utilityBills)
		.leftJoin(utilityAccounts, eq(utilityBills.accountId, utilityAccounts.id))
		.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
		.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
		.leftJoin(meters, eq(utilityBills.meterId, meters.id))
		.where(eq(utilityBills.id, id));
	return rows[0] ? withRefs(rows[0]) : undefined;
}

/** Full billing history for an account, newest first (for anomaly baselines). */
export async function billHistoryForAccount(accountId: string): Promise<UtilityBill[]> {
	return db
		.select()
		.from(utilityBills)
		.where(eq(utilityBills.accountId, accountId))
		.orderBy(desc(utilityBills.periodEnd));
}

export async function createBill(actorId: string, input: UtilityBillInput) {
	return auditedInsert(actorId, utilityBills, 'utility_bill', toRow(input));
}

export async function updateBill(actorId: string, id: string, input: UtilityBillInput) {
	return auditedUpdate(actorId, utilityBills, utilityBills.id, 'utility_bill', id, toRow(input));
}

/** Workflow transition; marking paid stamps today's payment date if absent. */
export async function setBillStatus(actorId: string, id: string, status: UtilityBill['status']) {
	return db.transaction(async (tx) => {
		const [before] = await tx.select().from(utilityBills).where(eq(utilityBills.id, id));
		if (!before) return undefined;

		const patch: Partial<typeof utilityBills.$inferInsert> = { status, updatedAt: new Date() };
		if (status === 'paid' && !before.paymentDate) {
			patch.paymentDate = new Date().toISOString().split('T')[0];
		}

		const [updated] = await tx
			.update(utilityBills)
			.set(patch)
			.where(eq(utilityBills.id, id))
			.returning();
		await recordAudit(tx, {
			actorId,
			entity: 'utility_bill',
			entityId: id,
			action: 'update',
			changes: { status: { from: before.status, to: status } }
		});
		return updated;
	});
}

export async function deleteBill(actorId: string, id: string): Promise<boolean> {
	return auditedDelete(actorId, utilityBills, utilityBills.id, 'utility_bill', id, (deleted) => ({
		totalCost: { from: deleted.totalCost, to: null }
	}));
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface ImportFailure {
	line: number;
	errors: string[];
}

export interface ImportResult {
	imported: number;
	failures: ImportFailure[];
}

/**
 * Import bills from CSV text. Rows are matched to accounts by `account_number`.
 * Valid rows are inserted in one transaction; invalid rows are reported with
 * their (1-based, header-inclusive) line numbers and skipped.
 */
export async function importBillsCSV(actorId: string, csvText: string): Promise<ImportResult> {
	const rows = parseCSV(csvText);
	if (rows.length === 0) {
		return { imported: 0, failures: [{ line: 1, errors: ['No data rows found'] }] };
	}

	const accounts = await db
		.select({ id: utilityAccounts.id, accountNumber: utilityAccounts.accountNumber })
		.from(utilityAccounts);
	const accountsByNumber = new Map(accounts.map((a) => [a.accountNumber, a.id]));

	const failures: ImportFailure[] = [];
	const validRows: UtilityBillInput[] = [];

	rows.forEach((row, idx) => {
		const line = idx + 2; // 1-based + header row
		const accountId = accountsByNumber.get(row.account_number ?? '');
		if (!accountId) {
			failures.push({
				line,
				errors: [
					row.account_number
						? `No account found with number "${row.account_number}"`
						: 'Missing account_number'
				]
			});
			return;
		}

		const parsed = utilityBillSchema.safeParse({
			accountId,
			statementDate: row.statement_date ?? '',
			periodStart: row.period_start ?? '',
			periodEnd: row.period_end ?? '',
			dueDate: row.due_date ?? '',
			usage: row.usage ?? '',
			unit: row.unit ?? '',
			demandKw: row.demand_kw ?? '',
			energyCharge: row.energy_charge ?? '',
			demandCharge: row.demand_charge ?? '',
			fixedCharge: row.fixed_charge ?? '',
			taxesFees: row.taxes_fees ?? '',
			otherCharges: row.other_charges ?? '',
			totalCost: row.total_cost ?? '',
			status: (BILL_STATUSES as readonly string[]).includes(row.status?.toLowerCase() ?? '')
				? (row.status!.toLowerCase() as UtilityBillInput['status'])
				: 'pending',
			readingType: row.reading_type?.toLowerCase() ?? '',
			notes: row.notes ?? ''
		});

		if (!parsed.success) {
			failures.push({
				line,
				errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
			});
			return;
		}
		validRows.push(parsed.data);
	});

	if (validRows.length > 0) {
		await db.transaction(async (tx) => {
			for (const input of validRows) {
				const [created] = await tx.insert(utilityBills).values(toRow(input)).returning();
				await recordAudit(tx, {
					actorId,
					entity: 'utility_bill',
					entityId: created.id,
					action: 'create',
					changes: { source: { from: null, to: 'csv_import' } }
				});
			}
		});
	}

	return { imported: validRows.length, failures };
}

// ---------------------------------------------------------------------------
// Overview stats
// ---------------------------------------------------------------------------

export interface UtilityOverview {
	totalSpend12mo: number;
	billCount12mo: number;
	pendingCount: number;
	pendingTotal: number;
	spendByType: { type: string; total: number }[];
	monthlySpend: { month: string; total: number }[];
	dueSoon: BillWithRefs[];
}

export async function getUtilityOverview(): Promise<UtilityOverview> {
	const cutoff = new Date();
	cutoff.setFullYear(cutoff.getFullYear() - 1);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const rows = await db
		.select(billSelect)
		.from(utilityBills)
		.leftJoin(utilityAccounts, eq(utilityBills.accountId, utilityAccounts.id))
		.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
		.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
		.leftJoin(meters, eq(utilityBills.meterId, meters.id))
		.where(gte(utilityBills.periodEnd, cutoffStr))
		.orderBy(desc(utilityBills.periodEnd));

	const bills = rows.map(withRefs);

	const totalSpend12mo = bills.reduce((s, b) => s + Number(b.totalCost), 0);
	const pending = bills.filter((b) => b.status === 'pending');

	const byType = new Map<string, number>();
	for (const b of bills) {
		const type = b.accountUtilityType ?? 'other';
		byType.set(type, (byType.get(type) ?? 0) + Number(b.totalCost));
	}

	const months: { month: string; total: number }[] = [];
	const now = new Date();
	for (let i = 11; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		months.push({
			month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
			total: 0
		});
	}
	for (const b of bills) {
		const key = b.periodEnd.slice(0, 7);
		const bucket = months.find((m) => m.month === key);
		if (bucket) bucket.total += Number(b.totalCost);
	}

	const today = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
	const dueSoon = bills
		.filter((b) => b.dueDate && b.status !== 'paid' && b.dueDate >= today)
		.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
		.slice(0, 5);

	return {
		totalSpend12mo,
		billCount12mo: bills.length,
		pendingCount: pending.length,
		pendingTotal: pending.reduce((s, b) => s + Number(b.totalCost), 0),
		spendByType: [...byType.entries()]
			.map(([type, total]) => ({ type, total }))
			.sort((a, b) => b.total - a.total),
		monthlySpend: months,
		dueSoon
	};
}

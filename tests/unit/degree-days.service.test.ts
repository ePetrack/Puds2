import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog, degreeDays } from '$lib/server/db/schema';
import {
	importDegreeDaysCSV,
	listDegreeDays,
	listStationCoverage
} from '$lib/server/services/degree-days';
import { ensureTestActor, TEST_ACTOR } from './setup';

const HEADER = 'station,period,base_temp_f,hdd,cdd,source';

async function reset() {
	await db.execute(sql`TRUNCATE TABLE audit_log, degree_days CASCADE`);
}

const auditRows = () =>
	db.select().from(auditLog).where(eq(auditLog.entity, 'degree_days')).orderBy(auditLog.createdAt);

beforeAll(async () => {
	await ensureTestActor();
});

beforeEach(reset);

describe('importDegreeDaysCSV', () => {
	it('imports a series and normalises YYYY-MM to the first of the month', async () => {
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,65,612.5,0,NOAA', 'KSFO,2026-02,65,498,2.5,NOAA'].join('\n')
		);

		expect(result.inserted).toBe(2);
		expect(result.updated).toBe(0);
		expect(result.failures).toEqual([]);

		const rows = await db.select().from(degreeDays).orderBy(degreeDays.period);
		expect(rows.map((r) => r.period)).toEqual(['2026-01-01', '2026-02-01']);
		expect(Number(rows[0].hdd)).toBe(612.5);
	});

	it('is idempotent — re-importing the same file replaces rather than duplicates', async () => {
		const csv = [HEADER, 'KSFO,2026-01,65,612.5,0,NOAA', 'KSFO,2026-02,65,498,2.5,NOAA'].join('\n');
		await importDegreeDaysCSV(TEST_ACTOR, csv);
		const second = await importDegreeDaysCSV(TEST_ACTOR, csv);

		expect(second.inserted).toBe(0);
		expect(second.updated).toBe(2);

		// The point of the upsert: a second upload of the same weather must not double the
		// heating load the allocator later fits against.
		const { total } = await listDegreeDays();
		expect(total).toBe(2);
	});

	it('applies a revised value over the stored one', async () => {
		await importDegreeDaysCSV(TEST_ACTOR, [HEADER, 'KSFO,2026-01,65,612.5,0,NOAA'].join('\n'));
		await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,65,700,1.5,NOAA revised'].join('\n')
		);

		const [row] = await db.select().from(degreeDays);
		expect(Number(row.hdd)).toBe(700);
		expect(Number(row.cdd)).toBe(1.5);
		expect(row.source).toBe('NOAA revised');
	});

	it('treats a different base temperature as a different series, not a conflict', async () => {
		await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,65,612.5,0,NOAA', 'KSFO,2026-01,60,410,0,NOAA'].join('\n')
		);

		const { total } = await listDegreeDays();
		expect(total).toBe(2);
		expect((await listStationCoverage()).map((s) => s.baseTempF).sort()).toEqual([60, 65]);
	});

	it('writes one audit row per import run, not one per month', async () => {
		await importDegreeDaysCSV(
			TEST_ACTOR,
			[
				HEADER,
				'KSFO,2026-01,65,612.5,0,NOAA',
				'KSFO,2026-02,65,498,2.5,NOAA',
				'KSFO,2026-03,65,401,8,NOAA'
			].join('\n')
		);

		const entries = await auditRows();
		expect(entries).toHaveLength(1);
		const changes = entries[0].changes as {
			import: { to: { rows: number; inserted: number; series: { firstPeriod: string }[] } };
		};
		expect(changes.import.to.rows).toBe(3);
		expect(changes.import.to.inserted).toBe(3);
		expect(changes.import.to.series[0].firstPeriod).toBe('2026-01-01');
	});

	it('rejects a malformed row and imports the rest', async () => {
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,65,612.5,0,NOAA', 'KSFO,not-a-month,65,100,0,NOAA'].join('\n')
		);

		expect(result.inserted).toBe(1);
		expect(result.failures).toHaveLength(1);
		expect(result.failures[0].line).toBe(3);
		expect(result.failures[0].errors.join(' ')).toMatch(/period/);
	});

	it('rejects the same month twice in one file rather than letting write order decide', async () => {
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,65,612.5,0,NOAA', 'KSFO,2026-01,65,999,0,NOAA'].join('\n')
		);

		expect(result.inserted).toBe(1);
		expect(result.failures[0].errors.join(' ')).toMatch(/line 2/);
		const [row] = await db.select().from(degreeDays);
		expect(Number(row.hdd)).toBe(612.5);
	});

	it('assumes a 65°F base when the column is absent, and says so', async () => {
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			['station,period,hdd,cdd', 'KSFO,2026-01,612.5,0'].join('\n')
		);

		expect(result.inserted).toBe(1);
		expect(result.notices.join(' ')).toMatch(/assumed 65°F/);
		const [row] = await db.select().from(degreeDays);
		expect(Number(row.baseTempF)).toBe(65);
	});

	it('treats a blank base temperature as an error rather than assuming one', async () => {
		// Absent column is a documented assumption; a blank cell is missing data, and this
		// codebase does not quietly fill missing data in.
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,2026-01,,612.5,0,NOAA'].join('\n')
		);

		expect(result.inserted).toBe(0);
		expect(result.failures[0].errors.join(' ')).toMatch(/baseTempF/);
	});

	it('reports an empty file instead of silently succeeding', async () => {
		const result = await importDegreeDaysCSV(TEST_ACTOR, HEADER);
		expect(result.inserted).toBe(0);
		expect(result.failures[0].errors[0]).toMatch(/No data rows/);
	});

	it('writes nothing when every row is rejected', async () => {
		const result = await importDegreeDaysCSV(
			TEST_ACTOR,
			[HEADER, 'KSFO,nope,65,1,0,NOAA'].join('\n')
		);
		expect(result.inserted).toBe(0);
		expect((await listDegreeDays()).total).toBe(0);
		expect(await auditRows()).toHaveLength(0);
	});
});

describe('listDegreeDays', () => {
	beforeEach(async () => {
		await importDegreeDaysCSV(
			TEST_ACTOR,
			[
				HEADER,
				'KSFO,2026-01,65,612.5,0,NOAA',
				'KSFO,2026-02,65,498,2.5,NOAA',
				'KBOS,2026-01,65,1100,0,NOAA'
			].join('\n')
		);
	});

	it('filters by station', async () => {
		const page = await listDegreeDays({ station: 'KBOS' });
		expect(page.total).toBe(1);
		expect(page.items[0].station).toBe('KBOS');
	});

	it('filters by period range', async () => {
		const page = await listDegreeDays({ from: '2026-02-01', to: '2026-02-01' });
		expect(page.total).toBe(1);
		expect(page.items[0].period).toBe('2026-02-01');
	});
});

describe('listStationCoverage', () => {
	it('reports the span and month count per series, longest first', async () => {
		await importDegreeDaysCSV(
			TEST_ACTOR,
			[
				HEADER,
				'KSFO,2026-01,65,612.5,0,NOAA',
				'KSFO,2026-02,65,498,2.5,NOAA',
				'KBOS,2026-01,65,1100,0,NOAA'
			].join('\n')
		);

		const coverage = await listStationCoverage();
		expect(coverage[0]).toMatchObject({
			station: 'KSFO',
			baseTempF: 65,
			months: 2,
			firstPeriod: '2026-01-01',
			lastPeriod: '2026-02-01'
		});
		expect(coverage[1].station).toBe('KBOS');
	});

	it('returns nothing when no weather is stored', async () => {
		await db.delete(degreeDays).where(and());
		expect(await listStationCoverage()).toEqual([]);
	});
});

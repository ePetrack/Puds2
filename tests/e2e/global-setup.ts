import { execFileSync } from 'node:child_process';
import postgres from 'postgres';

/**
 * Build the e2e suite its own database, from scratch, before every run.
 *
 * The suite used to run against seeded `puds_dev` and leave `E2E …` rows behind, so dev data
 * accumulated run over run and specs that assume seeded data started failing until someone
 * re-created the database by hand. Pointing at a disposable `puds_e2e` makes that impossible
 * rather than merely documented.
 *
 * Deliberately **not** derived from `DATABASE_URL`: that variable usually points at
 * `puds_dev`, and silently inheriting it would reintroduce the exact problem this removes.
 */

export const E2E_DATABASE_URL =
	process.env.E2E_DATABASE_URL ?? 'postgres://puds:puds@localhost:5432/puds_e2e';

/** `postgres://user:pass@host:port/name` → the name, and the same URL against `postgres`. */
function splitDatabaseUrl(url: string): { name: string; adminUrl: string } {
	const parsed = new URL(url);
	const name = parsed.pathname.replace(/^\//, '');
	if (!name) throw new Error(`E2E_DATABASE_URL has no database name: ${url}`);
	parsed.pathname = '/postgres';
	return { name, adminUrl: parsed.toString() };
}

export default async function globalSetup() {
	const { name, adminUrl } = splitDatabaseUrl(E2E_DATABASE_URL);

	const admin = postgres(adminUrl, { max: 1 });
	try {
		// FORCE terminates leftover connections — without it a still-open handle from a
		// previous run makes the drop fail rather than the run start clean.
		await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		await admin.unsafe(`CREATE DATABASE "${name}"`);
	} finally {
		await admin.end();
	}

	const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
	const run = (cmd: string, args: string[]) =>
		execFileSync(cmd, args, { env, stdio: 'inherit', shell: process.platform === 'win32' });

	run('npx', ['drizzle-kit', 'migrate']);
	// The seed script rather than a fixture of its own, so e2e exercises the same demo data
	// a developer sees and the two can't drift.
	run('npx', ['tsx', 'scripts/seed.ts']);
}

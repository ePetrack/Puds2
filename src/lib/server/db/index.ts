import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

// Lazy init: SvelteKit's build-time analysis imports server modules without env
// vars, and postgres.js only connects on first query anyway. process.env (not
// $env) so the same module works under SvelteKit, Vitest, and tsx scripts.
function getDb(): Db {
	if (!instance) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
		}
		instance = drizzle(postgres(url, { max: 10 }), { schema });
	}
	return instance;
}

export const db: Db = new Proxy({} as Db, {
	get(_target, prop) {
		const real = getDb() as unknown as Record<PropertyKey, unknown>;
		const value = real[prop];
		return typeof value === 'function'
			? (value as (...args: unknown[]) => unknown).bind(real)
			: value;
	}
});

export type Database = Db;
export { schema };

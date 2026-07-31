import { loadEnv } from 'vite';

/**
 * Copy `.env` into `process.env` for the Vite-run entry points.
 *
 * Server modules deliberately read `process.env` rather than `$env`, so the same code runs
 * under SvelteKit, Vitest and `tsx` scripts. Every entry point supplies the environment some
 * other way — `node build/index.js` from the shell, `db:migrate`/`db:seed` via
 * `tsx --env-file-if-exists`, CI from the workflow — except `vite dev` and `vite preview`,
 * which never copy `.env` into `process.env`. The result was that the first command in the
 * README Quick Start died with `AUTH_SECRET is not set` on a perfectly valid `.env`.
 *
 * The empty prefix is the point: Vite only exposes `VITE_*` by default, and none of these
 * keys are (or should be) `VITE_`-prefixed — they are server secrets.
 *
 * Real process environment wins. A value exported in the shell or set by CI is more specific
 * than a checked-out `.env`, and silently overriding it would make `DATABASE_URL=… npm run dev`
 * quietly ignore the caller.
 */
export function applyDotEnv(mode: string, envDir: string): Record<string, string> {
	const loaded = loadEnv(mode, envDir, '');
	for (const [key, value] of Object.entries(loaded)) {
		if (process.env[key] === undefined) process.env[key] = value;
	}
	return loaded;
}

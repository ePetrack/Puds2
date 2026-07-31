import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyDotEnv } from '$lib/config/dotenv';

/**
 * ENV-1. The e2e suite runs the *built* server, which gets its environment from the shell, so
 * it structurally cannot catch `vite dev` failing to read `.env`. These tests can.
 */

const KEYS = ['ENV1_FROM_FILE', 'ENV1_ALREADY_SET'];
const dirs: string[] = [];

function envDirWith(contents: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'puds-env-'));
	writeFileSync(join(dir, '.env'), contents);
	dirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const key of KEYS) delete process.env[key];
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('applyDotEnv', () => {
	it('copies unprefixed keys into process.env', () => {
		// The whole point: these are server secrets, so none of them are VITE_-prefixed and
		// Vite's default prefix filter would skip every one.
		applyDotEnv('development', envDirWith('ENV1_FROM_FILE=from-the-file\n'));
		expect(process.env.ENV1_FROM_FILE).toBe('from-the-file');
	});

	it('does not override a value already in the real environment', () => {
		// `DATABASE_URL=… npm run dev` has to keep working; the caller is more specific than a
		// checked-out .env, and CI supplies its own values this way.
		process.env.ENV1_ALREADY_SET = 'from-the-shell';
		applyDotEnv('development', envDirWith('ENV1_ALREADY_SET=from-the-file\n'));
		expect(process.env.ENV1_ALREADY_SET).toBe('from-the-shell');
	});

	it('is a no-op when there is no .env at all', () => {
		const dir = mkdtempSync(join(tmpdir(), 'puds-env-'));
		dirs.push(dir);
		expect(() => applyDotEnv('development', dir)).not.toThrow();
		expect(process.env.ENV1_FROM_FILE).toBeUndefined();
	});
});

describe('vite.config.ts', () => {
	it('still calls applyDotEnv', () => {
		// Guards the wiring, not the helper. Without this, deleting the call from the config
		// would leave every test above green while `npm run dev` breaks again.
		const config = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
		expect(config).toMatch(/applyDotEnv\(/);
	});
});

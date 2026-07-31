import { defineConfig } from '@playwright/test';
import { E2E_DATABASE_URL } from './tests/e2e/global-setup';

// E2e runs against a production build (`npm run build` first) backed by its own throwaway
// database. `globalSetup` drops, recreates, migrates and seeds `puds_e2e` on every run, so
// the suite can't accumulate rows in `puds_dev` and never needs a manual re-seed.
export default defineConfig({
	testDir: 'tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'retain-on-failure',
		// Sandboxed environments can point at a pre-installed Chromium instead of downloading one
		...(process.env.PLAYWRIGHT_CHROMIUM_PATH
			? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
			: {})
	},
	webServer: {
		command: 'node build/index.js',
		port: 4173,
		reuseExistingServer: false,
		env: {
			PORT: '4173',
			ORIGIN: 'http://localhost:4173',
			// Not `process.env.DATABASE_URL` — that points at puds_dev, which is what this moved away from.
			DATABASE_URL: E2E_DATABASE_URL,
			AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-test-secret-not-for-production',
			LOG_LEVEL: 'warn'
		}
	}
});

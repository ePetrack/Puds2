import { defineConfig } from '@playwright/test';

// E2e runs against a production build backed by the seeded dev/e2e database.
// CI and local runs both: npm run db:migrate && npm run db:seed && npm run build first.
export default defineConfig({
	testDir: 'tests/e2e',
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
			DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://puds:puds@localhost:5432/puds_dev',
			AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-test-secret-not-for-production',
			LOG_LEVEL: 'warn'
		}
	}
});

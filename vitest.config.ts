import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib')
		}
	},
	test: {
		include: ['tests/unit/**/*.test.ts'],
		environment: 'node',
		// Service tests share one database; keep them off parallel workers
		fileParallelism: false,
		env: {
			DATABASE_URL: process.env.DATABASE_URL_TEST ?? 'postgres://puds:puds@localhost:5432/puds_test'
		}
	}
});

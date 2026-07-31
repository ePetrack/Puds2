import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { applyDotEnv } from './src/lib/config/dotenv';

export default defineConfig(({ mode }) => {
	// `vite dev` and `vite preview` do not put `.env` into `process.env`, which server modules
	// read directly — see `applyDotEnv` and ENV-1. Removing this breaks `npm run dev` on a
	// valid `.env`; `tests/unit/dotenv.test.ts` fails if it goes.
	applyDotEnv(mode, process.cwd());

	return { plugins: [sveltekit()] };
});

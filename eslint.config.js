import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			// The app is served from the domain root; base-path-aware resolve() adds noise
			'svelte/no-navigation-without-resolve': 'off',
			// svelte-ignore comments target compiler warnings surfaced by svelte-check,
			// which this eslint plugin can't see and would flag as unused
			'svelte/no-unused-svelte-ignore': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'node_modules/',
			'drizzle/',
			'playwright-report/',
			'test-results/'
		]
	}
);

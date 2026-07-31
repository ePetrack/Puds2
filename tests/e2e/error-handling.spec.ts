import { expect, test, type Page } from '@playwright/test';

/**
 * Cover for the `QA-1` / `QA-2` defects.
 *
 * Ids are Postgres `uuid`s, so a malformed one didn't come back empty — it made the query
 * itself fail (`invalid input syntax for type uuid`) and that unhandled throw rendered a 500
 * where the situation plainly means 404. The same applied to the list filters.
 */

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

const DETAIL_ROUTES = [
	'/clients/not-a-uuid',
	'/buildings/not-a-uuid',
	'/campuses/not-a-uuid',
	'/complexes/not-a-uuid',
	'/projects/not-a-uuid',
	'/utilities/bills/not-a-uuid',
	'/clients/not-a-uuid/edit',
	'/utilities/meters/not-a-uuid/edit'
];

test.describe('malformed ids', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	for (const path of DETAIL_ROUTES) {
		test(`${path} answers 404, not 500`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(404);
		});
	}

	test('a well-formed id that matches nothing still 404s', async ({ page }) => {
		// The guard must not swallow the ordinary not-found case it sits in front of.
		const response = await page.goto('/clients/00000000-0000-4000-8000-000000000000');
		expect(response?.status()).toBe(404);
		await expect(page.getByText('Client not found')).toBeVisible();
	});

	test('the document download endpoint 404s rather than erroring', async ({ page }) => {
		const response = await page.goto('/documents/not-a-uuid/download');
		expect(response?.status()).toBe(404);
	});
});

test.describe('malformed list filters', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	// A filter is a UI affordance, not an assertion about the data — junk should be ignored
	// and the list still render, rather than taking the page down.
	const FILTERED = [
		['/buildings?client=not-a-uuid', 'Buildings'],
		['/campuses?client=not-a-uuid', 'Campuses'],
		['/projects?client=not-a-uuid', 'Projects'],
		['/energy?meter=not-a-uuid&building=also-junk', 'Energy Data'],
		['/utilities/bills?account=not-a-uuid', 'Utility Bills'],
		['/connections?client=not-a-uuid', 'Connections']
	];

	for (const [path, heading] of FILTERED) {
		test(`${path} renders the list`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
		});
	}
});

test.describe('error page', () => {
	test('a 404 inside the app renders the styled page, not a bare stack', async ({ page }) => {
		await signIn(page);
		await page.goto('/clients/not-a-uuid');

		await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
	});
});

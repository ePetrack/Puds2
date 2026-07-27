import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

const PRIMARY = [
	'Home',
	'Bill Management',
	'Utility Accounts',
	'Plant Management',
	'Facility Management'
];

test.describe('sidebar navigation', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('shows the five primary areas plus the supporting group', async ({ page }) => {
		const nav = page.getByRole('navigation');
		for (const name of PRIMARY) {
			await expect(nav.getByRole('link', { name })).toBeVisible();
		}
		await expect(page.getByText('Insights & Work')).toBeVisible();
		// Supporting features stay reachable
		for (const name of ['Clients', 'Energy Data', 'Analysis', 'Projects', 'Tasks', 'Documents']) {
			await expect(nav.getByRole('link', { name })).toBeVisible();
		}
	});

	test('facility management hub links the hierarchy and shows counts', async ({ page }) => {
		await page.goto('/facilities');
		await expect(
			page.getByRole('heading', { name: 'Facility Management', level: 1 })
		).toBeVisible();
		await expect(page.getByText('How the hierarchy works')).toBeVisible();
		for (const name of ['Campuses', 'Complexes', 'Buildings', 'Meters']) {
			await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
		}
	});

	test('plant management is present and honest about not being built', async ({ page }) => {
		await page.goto('/plants');
		await expect(page.getByRole('heading', { name: 'Plant Management', level: 1 })).toBeVisible();
		await expect(page.getByText('Not built yet')).toBeVisible();
	});

	// Guards the sibling-route matching: /utilities/bills and /utilities/accounts must not
	// both light up, and the physical-hierarchy routes roll up to Facility Management.
	const activeCases: [string, string][] = [
		['/', 'Home'],
		['/utilities/bills', 'Bill Management'],
		['/utilities/accounts', 'Utility Accounts'],
		['/plants', 'Plant Management'],
		['/facilities', 'Facility Management'],
		['/campuses', 'Facility Management'],
		['/complexes', 'Facility Management'],
		['/buildings', 'Facility Management'],
		['/utilities/meters', 'Facility Management'],
		['/clients', 'Clients']
	];

	for (const [path, expected] of activeCases) {
		test(`${path} highlights exactly "${expected}"`, async ({ page }) => {
			await page.goto(path);
			const active = page.locator('nav a.sidebar-link-active');
			await expect(active).toHaveCount(1);
			await expect(active).toHaveText(new RegExp(expected));
		});
	}
});

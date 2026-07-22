import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('clients CRUD', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('lists seeded clients', async ({ page }) => {
		await page.goto('/clients');
		await expect(page.getByRole('link', { name: 'State University' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Tech College' })).toBeVisible();
	});

	test('creates, edits, and deletes a client', async ({ page }) => {
		const name = `E2E University ${Date.now()}`;
		const renamed = `${name} Renamed`;

		// Create
		await page.goto('/clients/new');
		await page.getByLabel('Client Name').fill(name);
		await page.getByLabel('Contact Name').fill('E2E Contact');
		await page.getByRole('button', { name: 'Create Client' }).click();
		await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();

		// Edit
		await page.getByRole('link', { name: 'Edit' }).click();
		await page.getByLabel('Client Name').fill(renamed);
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await expect(page.getByRole('heading', { name: renamed, exact: true, level: 1 })).toBeVisible();

		// Delete from the list
		await page.goto(`/clients?search=${encodeURIComponent(renamed)}`);
		await page.getByRole('button', { name: 'Delete' }).first().click();
		await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
		await expect(page.getByText('No clients match your filters')).toBeVisible();
	});

	test('shows validation errors for a bad submission', async ({ page }) => {
		await page.goto('/clients/new');
		await page.getByLabel('Contact Email').fill('not-an-email');
		// Bypass browser-side required/email validation to exercise server validation
		await page.evaluate(() => {
			document.querySelector('form[method="POST" i]')?.setAttribute('novalidate', '');
			(document.querySelector('input[name="contactEmail"]') as HTMLInputElement).type = 'text';
			(document.querySelector('input[name="name"]') as HTMLInputElement).required = false;
		});
		await page.getByRole('button', { name: 'Create Client' }).click();
		await expect(page.getByText('Name is required')).toBeVisible();
		await expect(page.getByText('Invalid email')).toBeVisible();
	});
});

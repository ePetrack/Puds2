import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('utilities module', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('overview shows seeded spend and navigation tabs', async ({ page }) => {
		await page.goto('/utilities');
		await expect(page.getByRole('heading', { name: 'Utilities', level: 1 })).toBeVisible();
		await expect(page.getByText('Spend (Trailing 12 Months)')).toBeVisible();
		// Seeded data: 24 bills across 2 accounts
		await expect(page.getByText(/bills recorded/)).toBeVisible();
		// Tab bar (first match; quick actions repeat the label)
		await expect(page.getByRole('link', { name: 'Rate Schedules' }).first()).toBeVisible();
	});

	test('lists seeded accounts and filters bills by account', async ({ page }) => {
		await page.goto('/utilities/accounts');
		await expect(page.getByText('100-2345-678')).toBeVisible();
		await expect(page.getByText('200-8765-432')).toBeVisible();

		// Jump to the electricity account's bills
		await page
			.getByRole('row', { name: /100-2345-678/ })
			.getByRole('link', { name: 'Bills' })
			.click();
		await expect(page).toHaveURL(/\/utilities\/bills\?account=/);
		// Only rows for the filtered account are shown
		const rows = page.locator('tbody tr');
		await expect(rows.first()).toContainText('100-2345-678');
		await expect(page.locator('tbody').getByText('200-8765-432')).toHaveCount(0);
	});

	test('enters a bill and sees derived metrics on the detail page', async ({ page }) => {
		await page.goto('/utilities/bills/new');
		await page.getByLabel('Utility Account').selectOption({ index: 1 });
		await page.getByLabel('Statement Date').fill('2030-01-05');
		await page.getByLabel('Period Start').fill('2029-12-01');
		await page.getByLabel('Period End').fill('2029-12-31');
		await page.getByLabel('Usage', { exact: true }).fill('10000');
		await page.getByLabel('Unit', { exact: true }).fill('kWh');
		await page.getByLabel('Total Cost ($)').fill('1550');
		await page.getByRole('button', { name: 'Create Bill' }).click();

		// Detail page with derived metrics
		await expect(page).toHaveURL(/\/utilities\/bills\/[0-9a-f-]+$/);
		await expect(page.getByText('Blended $/Unit')).toBeVisible();
		await expect(page.getByText('$0.1550')).toBeVisible();

		// Workflow: mark paid updates the status pill in the header
		await page.getByRole('button', { name: /Mark Paid/ }).click();
		await expect(page.locator('h1').getByText('Paid')).toBeVisible();
	});

	test('creates a provider through the form', async ({ page }) => {
		const name = `E2E Utility Co ${Date.now()}`;
		await page.goto('/utilities/providers/new');
		await page.getByLabel('Provider Name').fill(name);
		await page.getByLabel('Water', { exact: true }).check();
		await page.getByRole('button', { name: 'Create Provider' }).click();
		await expect(page).toHaveURL('/utilities/providers');
		await expect(page.getByText(name)).toBeVisible();
	});
});

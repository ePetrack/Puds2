import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('projects', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('lists seeded projects with budgets', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByRole('link', { name: 'HVAC Upgrade - Science Hall' })).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'LED Lighting Retrofit - Campus Wide' })
		).toBeVisible();
	});

	test('creates a project with linked buildings and shows budget variance', async ({ page }) => {
		const name = `E2E Project ${Date.now()}`;
		await page.goto('/projects/new');
		await page.getByLabel('Client').selectOption({ label: 'State University' });
		await page.getByLabel('Project Name').fill(name);
		await page.getByLabel('Budget ($)').fill('100000');
		await page.getByLabel('Actual Cost ($)').fill('120000');
		await page.getByLabel('Science Hall').check();
		await page.getByRole('button', { name: 'Create Project' }).click();

		await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
		await expect(page.getByText('+$20,000.00 vs budget')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Science Hall' })).toBeVisible();
	});
});

test.describe('energy data', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('shows seeded readings and the monthly chart', async ({ page }) => {
		await page.goto('/energy');
		await expect(page.getByRole('heading', { name: 'Energy Data', level: 1 })).toBeVisible();
		await expect(page.getByText('Monthly Usage (Last 12 Months)')).toBeVisible();
		await expect(page.locator('tbody tr').first()).toContainText('MTR-');
	});

	test('adds a manual reading and blocks duplicates', async ({ page }) => {
		// Unique per run so re-runs against a persistent DB don't collide
		const d = new Date(2030, 0, 1);
		d.setDate(d.getDate() + (Date.now() % 3650));
		const dateStr = d.toISOString().split('T')[0];

		await page.goto('/energy/new');
		await page.getByLabel('Meter').selectOption({ index: 1 });
		await page.getByLabel('Reading Date').fill(dateStr);
		await page.getByLabel(/^Usage/).fill('12345');
		await page.getByRole('button', { name: 'Add Reading' }).click();
		await expect(page).toHaveURL('/energy');

		// Same meter + date again → validation error, no crash
		await page.goto('/energy/new');
		await page.getByLabel('Meter').selectOption({ index: 1 });
		await page.getByLabel('Reading Date').fill(dateStr);
		await page.getByLabel(/^Usage/).fill('999');
		await page.getByRole('button', { name: 'Add Reading' }).click();
		await expect(page.getByText('A reading already exists for this meter and date')).toBeVisible();
	});
});

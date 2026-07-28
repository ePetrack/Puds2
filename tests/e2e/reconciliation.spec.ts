import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

/**
 * Open the reconciliation page for the seeded complex master.
 *
 * Other specs create their own master/submeter pairs in the shared dev database, so the
 * default selection can't be assumed — pick the seeded meter explicitly.
 */
async function openSeededMaster(page: Page, params = '') {
	await page.goto(`/reconciliation${params}`);
	const value = await page
		.locator('#meter option', { hasText: 'MTR-ELEC-MASTER' })
		.first()
		.getAttribute('value');
	await page.locator('#meter').selectOption(value!);
	await page.getByRole('button', { name: 'Apply' }).click();
	await expect(page.getByTestId('reconciliation-table')).toBeVisible();
}

test.describe('meter reconciliation', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('reconciles the seeded master against its submeters', async ({ page }) => {
		await openSeededMaster(page);
		await expect(
			page.getByRole('heading', { name: 'Meter Reconciliation', level: 1 })
		).toBeVisible();

		// The seed gives the master ~96k against ~43k + ~28k submetered, so the gap is real.
		await expect(page.getByText(/MTR-ELEC-SUB-SCI/)).toBeVisible();
		await expect(page.getByRole('cell', { name: 'Unaccounted' }).first()).toBeVisible();
	});

	test('widening the tolerance reclassifies without changing the arithmetic', async ({ page }) => {
		await openSeededMaster(page);
		const masterTotal = await page.getByTestId('reconciliation-table').locator('tbody').innerText();

		// 50 is the accepted maximum; the seeded gap is ~25%, so it falls inside the band.
		await openSeededMaster(page, '?tolerance=50');
		await expect(page.getByRole('cell', { name: 'Unaccounted' })).toHaveCount(0);
		await expect(page.getByRole('cell', { name: 'Balanced' }).first()).toBeVisible();

		// Reclassification only — the underlying numbers must be untouched.
		const widened = await page.getByTestId('reconciliation-table').locator('tbody').innerText();
		expect(widened.replace(/Balanced/g, '')).toBe(masterTotal.replace(/Unaccounted/g, ''));
	});

	test('explains each status it shows', async ({ page }) => {
		await openSeededMaster(page);
		await expect(
			page.getByText('Expected wherever coverage is partial', { exact: false })
		).toBeVisible();
	});

	test('is reachable from the sidebar', async ({ page }) => {
		await page.getByRole('navigation').getByRole('link', { name: 'Reconciliation' }).click();
		await expect(page).toHaveURL('/reconciliation');
	});
});

import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('physical hierarchy', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('campus → complex → building → master meter → submeter journey', async ({ page }) => {
		const suffix = Date.now();
		const campusName = `E2E Campus ${suffix}`;
		const complexName = `E2E Complex ${suffix}`;
		const buildingName = `E2E Hall ${suffix}`;
		const masterMeterNo = `E2E-MASTER-${suffix}`;
		const subMeterNo = `E2E-SUB-${suffix}`;

		// 1. Campus
		await page.goto('/campuses/new');
		await page.getByLabel('Client').selectOption({ label: 'State University' });
		await page.getByLabel('Campus Name').fill(campusName);
		await page.getByLabel('Code').fill('E2E');
		await page.getByRole('button', { name: 'Create Campus' }).click();
		await expect(page).toHaveURL(/\/campuses\/[0-9a-f-]+$/);
		await expect(page.getByRole('heading', { name: campusName })).toBeVisible();

		// 2. Complex under that campus
		await page.goto('/complexes/new');
		await page.getByLabel('Client').selectOption({ label: 'State University' });
		await page.getByLabel('Campus').selectOption({ label: campusName });
		await page.getByLabel('Complex Name').fill(complexName);
		await page.getByRole('button', { name: 'Create Complex' }).click();
		await expect(page).toHaveURL(/\/complexes\/[0-9a-f-]+$/);
		await expect(page.getByRole('heading', { name: complexName })).toBeVisible();
		await expect(page.getByText(campusName)).toBeVisible();

		// 3. Building assigned to both the campus and the complex
		await page.goto('/buildings/new');
		await page.getByLabel('Client').selectOption({ label: 'State University' });
		await page.getByLabel('Campus').selectOption({ label: campusName });
		await page.getByLabel('Complex').selectOption({ label: complexName });
		await page.getByLabel('Building Name').fill(buildingName);
		await page.getByRole('button', { name: 'Create Building' }).click();
		await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
		await expect(page.getByRole('link', { name: campusName })).toBeVisible();
		await expect(page.getByRole('link', { name: complexName })).toBeVisible();

		// 4. Complex master meter (premise = complex)
		await page.goto('/utilities/meters/new');
		await page.getByRole('radio', { name: 'Complex (master meter)' }).check();
		await page.locator('select[name="complexId"]').selectOption({ label: complexName });
		await page.locator('input[name="meterNumber"]').fill(masterMeterNo);
		await page.locator('select[name="utilityType"]').selectOption({ label: 'Electricity' });
		await page.locator('select[name="unit"]').selectOption({ label: 'kWh' });
		await page.getByRole('button', { name: 'Create Meter' }).click();
		await expect(page).toHaveURL('/utilities/meters');
		const masterRow = page.getByRole('row', { name: new RegExp(masterMeterNo) });
		await expect(masterRow).toContainText(complexName);
		await expect(masterRow).toContainText('Complex');

		// 5. Building submeter under the master meter (premise = building, parent = master)
		await page.goto('/utilities/meters/new');
		// premise defaults to a single building
		await page.locator('select[name="buildingId"]').selectOption({ label: buildingName });
		await page.locator('input[name="meterNumber"]').fill(subMeterNo);
		await page.locator('select[name="utilityType"]').selectOption({ label: 'Electricity' });
		await page.locator('select[name="unit"]').selectOption({ label: 'kWh' });
		await page.locator('select[name="parentMeterId"]').selectOption({ label: masterMeterNo });
		await page.getByRole('button', { name: 'Create Meter' }).click();
		await expect(page).toHaveURL('/utilities/meters');

		const subRow = page.getByRole('row', { name: new RegExp(subMeterNo) });
		await expect(subRow).toContainText(buildingName);
		// Submeter badge references its parent meter number
		await expect(subRow).toContainText(masterMeterNo);
	});

	test('rejects a submeter whose utility type differs from its parent', async ({ page }) => {
		const suffix = Date.now();
		const elecNo = `E2E-E-${suffix}`;

		// An electricity meter on a seeded building
		await page.goto('/utilities/meters/new');
		await page.locator('select[name="buildingId"]').selectOption({ label: 'Main Library' });
		await page.locator('input[name="meterNumber"]').fill(elecNo);
		await page.locator('select[name="utilityType"]').selectOption({ label: 'Electricity' });
		await page.locator('select[name="unit"]').selectOption({ label: 'kWh' });
		await page.getByRole('button', { name: 'Create Meter' }).click();
		await expect(page).toHaveURL('/utilities/meters');

		// A gas meter cannot select the electricity meter as parent — with matching
		// utility types the parent list is filtered, so mismatches never reach submit;
		// this asserts the filtered list excludes the electric parent for a gas meter.
		await page.goto('/utilities/meters/new');
		await page.locator('select[name="buildingId"]').selectOption({ label: 'Main Library' });
		await page.locator('select[name="utilityType"]').selectOption({ label: 'Natural Gas' });
		const parentSelect = page.locator('select[name="parentMeterId"]');
		await expect(parentSelect.getByRole('option', { name: elecNo })).toHaveCount(0);
	});
});

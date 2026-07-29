import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

/** Open the seeded master-meter bill — the only kind covering several buildings. */
async function openMasterBill(page: Page): Promise<string> {
	await page.goto('/utilities/bills');
	const hrefs = await page
		.locator('a[href^="/utilities/bills/"]')
		.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));

	for (const href of [...new Set(hrefs)].filter((h) =>
		/^\/utilities\/bills\/[0-9a-f-]{36}$/.test(h)
	)) {
		await page.goto(href);
		if (await page.getByRole('button', { name: 'Preview' }).isVisible()) return href;
	}
	throw new Error('No allocatable bill found in the seeded data');
}

/** A CSV body for a station unique to this run, so it can't collide with seeded data. */
function csvFor(station: string) {
	return [
		'station,period,base_temp_f,hdd,cdd,source',
		`${station},2026-01,65,612.5,0,E2E`,
		`${station},2026-02,65,498,2.5,E2E`,
		`${station},2026-03,65,401,8,E2E`
	].join('\n');
}

async function upload(page: Page, body: string) {
	await page.goto('/energy/degree-days/import');
	await page.getByLabel('CSV File').setInputFiles({
		name: 'degree-days.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(body)
	});
	await page.getByRole('button', { name: 'Import Degree Days' }).click();
}

test.describe('degree days', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('imports a series, then replaces it rather than duplicating on re-import', async ({
		page
	}) => {
		const station = `E2E${Date.now()}`;
		await upload(page, csvFor(station));
		await expect(page.getByText('3 added')).toBeVisible();
		await expect(page.getByText(`${station} at 65°F`)).toBeVisible();

		await page.goto(`/energy/degree-days?station=${station}`);
		await expect(page.getByText('3 months')).toBeVisible();

		// Re-uploading the same weather must replace those months, not add three more —
		// otherwise a corrected series would double the load the allocator fits against.
		await upload(page, csvFor(station));
		await expect(page.getByText('0 added')).toBeVisible();
		await expect(page.getByText('3 replaced')).toBeVisible();

		await page.goto(`/energy/degree-days?station=${station}`);
		await expect(page.getByText('3 months')).toBeVisible();
	});

	test('reports the offending line instead of failing the whole file', async ({ page }) => {
		const station = `E2E${Date.now()}`;
		await upload(
			page,
			[
				'station,period,base_temp_f,hdd,cdd,source',
				`${station},2026-01,65,612.5,0,E2E`,
				`${station},not-a-month,65,100,0,E2E`
			].join('\n')
		);

		await expect(page.getByText('1 added')).toBeVisible();
		await expect(page.getByText(/Line 3:.*period/)).toBeVisible();
	});

	test('is reachable from Energy Data and shows coverage', async ({ page }) => {
		await page.goto('/energy');
		await page.getByRole('link', { name: 'Degree Days' }).click();
		await expect(page).toHaveURL('/energy/degree-days');
		await expect(page.getByRole('heading', { name: 'Coverage' })).toBeVisible();
	});
});

test.describe('weather-normalised allocation', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('states what weather is on hand before the split is run', async ({ page }) => {
		await openMasterBill(page);

		await page.selectOption('#allocation-method', 'weather_normalized');
		const panel = page.getByTestId('weather-coverage');
		await expect(panel).toBeVisible();
		// The seed ships a KSFO series, so the panel must name it rather than leaving the
		// operator to discover a silent fallback from a warning after the fact.
		await expect(panel).toContainText('KSFO');
	});
});

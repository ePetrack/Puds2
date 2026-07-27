import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

const BILL_LINK = 'a[href^="/utilities/bills/"]';

/** Hrefs of the bill detail pages on the first page of the bills list. */
async function billHrefs(page: Page): Promise<string[]> {
	await page.goto('/utilities/bills');
	const hrefs = await page
		.locator(BILL_LINK)
		.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));
	// /new, /import and per-account filters are not bill detail pages.
	return [...new Set(hrefs)].filter((h) => /^\/utilities\/bills\/[0-9a-f-]{36}$/.test(h));
}

/** Open the seeded master-meter bill — the only kind covering several buildings. */
async function openMasterBill(page: Page): Promise<string> {
	for (const href of await billHrefs(page)) {
		await page.goto(href);
		if (await page.getByRole('button', { name: 'Preview' }).isVisible()) return href;
	}
	throw new Error('No allocatable bill found in the seeded data');
}

test.describe('connections review', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('splits meters into utility-owned and internally-owned, and says the split is derived', async ({
		page
	}) => {
		await page.goto('/connections');
		await expect(page.getByRole('heading', { name: 'Connections', level: 1 })).toBeVisible();
		await expect(page.getByText('Ownership shown here is derived, not recorded.')).toBeVisible();

		// The seeded master meter bills to an account; its submeters do not.
		await expect(page.getByRole('link', { name: 'MTR-ELEC-MASTER' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'MTR-ELEC-SUB-SCI' })).toBeVisible();
		await expect(page.getByText('Utility-owned meters').first()).toBeVisible();
		await expect(page.getByText('Internally-owned meters').first()).toBeVisible();
	});

	test('the ownership filter narrows to one side', async ({ page }) => {
		await page.goto('/connections?ownership=utility');
		await expect(page.getByRole('link', { name: 'MTR-ELEC-MASTER' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'MTR-ELEC-SUB-SCI' })).toHaveCount(0);
	});

	test('reports a meter with no account and no parent as a gap', async ({ page }) => {
		await page.goto('/connections');
		await expect(page.getByRole('heading', { name: /Gaps/ })).toBeVisible();

		// Create the gap rather than relying on the seed, which is deliberately complete.
		const meterNo = `E2E-GAP-${Date.now()}`;
		await page.goto('/utilities/meters/new');
		await page.locator('select[name="buildingId"]').selectOption({ label: 'Main Library' });
		await page.locator('input[name="meterNumber"]').fill(meterNo);
		await page.locator('select[name="utilityType"]').selectOption({ label: 'Electricity' });
		await page.locator('select[name="unit"]').selectOption({ label: 'kWh' });
		await page.getByRole('button', { name: 'Create Meter' }).click();
		await expect(page).toHaveURL('/utilities/meters');

		await page.goto('/connections');
		await expect(page.getByText('Unattributed meters', { exact: false })).toBeVisible();
		await expect(page.getByRole('link', { name: meterNo })).toHaveCount(2); // gaps + premise list
	});

	test('is reachable from the sidebar', async ({ page }) => {
		await page.getByRole('navigation').getByRole('link', { name: 'Connections' }).click();
		await expect(page).toHaveURL('/connections');
	});
});

test.describe('bill allocation', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('previews before saving, then persists a reconciling split', async ({ page }) => {
		const billHref = await openMasterBill(page);

		await page.selectOption('#allocation-method', 'area');
		await page.getByRole('button', { name: 'Preview' }).click();

		const table = page.getByTestId('allocation-table');
		await expect(table).toBeVisible();
		await expect(page.getByText('Preview — nothing has been saved yet.')).toBeVisible();
		await expect(table.getByRole('link', { name: 'Science Hall' })).toBeVisible();
		await expect(table.getByRole('link', { name: 'Student Center' })).toBeVisible();

		// A preview must not be persisted.
		await page.goto(billHref);
		await expect(page.getByText('Preview — nothing has been saved yet.')).toHaveCount(0);

		await page.selectOption('#allocation-method', 'area');
		await page.getByRole('button', { name: 'Save allocation' }).click();
		await expect(page.getByText(/^Saved · Square footage$/)).toBeVisible();

		// Survives a reload, and the shares still total 100%.
		await page.goto(billHref);
		await expect(page.getByTestId('allocation-table')).toBeVisible();
		await expect(page.getByTestId('allocation-table').locator('tfoot')).toContainText('100.00%');

		await page.getByRole('button', { name: 'Remove' }).click();
		await page.getByRole('button', { name: 'Remove', exact: true }).last().click();
		await expect(page.getByText(/^Saved · /)).toHaveCount(0);
	});

	test('shows the unmetered remainder as its own line under a submetered split', async ({
		page
	}) => {
		await openMasterBill(page);

		await page.selectOption('#allocation-method', 'submetered');
		await page.getByRole('button', { name: 'Preview' }).click();

		const table = page.getByTestId('allocation-table');
		await expect(table.getByText('Unallocated / common area')).toBeVisible();
		await expect(page.getByText('shown as a separate common-area line')).toBeVisible();
	});

	test('explains itself on a bill that cannot be allocated', async ({ page }) => {
		for (const href of await billHrefs(page)) {
			await page.goto(href);
			if (await page.getByText("Allocation isn't available for this bill.").isVisible()) {
				await expect(page.getByText(/complex master meter/).first()).toBeVisible();
				return;
			}
		}
		throw new Error('Expected at least one bill on a plain building meter');
	});
});

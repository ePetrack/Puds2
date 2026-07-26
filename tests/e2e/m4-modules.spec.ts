import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('tasks', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('creates a task and completes it from the list', async ({ page }) => {
		const title = `E2E Task ${Date.now()}`;
		await page.goto('/tasks/new');
		await page.getByLabel('Title').fill(title);
		await page.getByLabel('Priority').selectOption('urgent');
		await page.getByRole('button', { name: 'Create Task' }).click();
		await expect(page).toHaveURL('/tasks');

		const row = page.getByRole('listitem').filter({ hasText: title });
		await expect(row).toBeVisible();
		await expect(row.getByText('Urgent')).toBeVisible();

		// Complete it — the default (open) filter should then hide it
		await row.getByRole('button', { name: '✓ Done' }).click();
		await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
	});
});

test.describe('documents', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('uploads, downloads, and deletes a document', async ({ page }) => {
		const title = `E2E Doc ${Date.now()}`;
		await page.goto('/documents');
		await page.getByRole('button', { name: '+ Upload Document' }).first().click();
		await page.getByLabel('Title').fill(title);
		await page.getByLabel('File').setInputFiles({
			name: 'report.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('quarterly energy report contents')
		});
		await page.getByRole('button', { name: 'Upload', exact: true }).click();

		const row = page.getByRole('row').filter({ hasText: title });
		await expect(row).toBeVisible();

		// Download round-trips the stored bytes
		const downloadPromise = page.waitForEvent('download');
		await row.getByRole('link', { name: 'Download' }).click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe('report.txt');

		// Delete removes it from the list
		await row.getByRole('button', { name: 'Delete' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
		await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);
	});
});

test.describe('analysis', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('loads the Perspective viewer with the dataset', async ({ page }) => {
		await page.goto('/analysis');
		await expect(page.getByRole('heading', { name: 'Analysis', level: 1 })).toBeVisible();
		await expect(page.getByText(/Interactive pivoting over/)).toBeVisible();

		// The WASM engine boots: the viewer element mounts and the loading spinner clears
		await expect(page.locator('perspective-viewer')).toBeAttached();
		await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 20000 });
		await expect(page.getByRole('button', { name: /Cost by Month/ })).toBeVisible();
	});
});

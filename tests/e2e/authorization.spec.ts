import { expect, test } from '@playwright/test';

// The seeded consultant may write; this spec proves a client-role user cannot.
// It provisions a client-role user through the server API before the test.
test.describe('role-based authorization', () => {
	test('client role cannot create clients', async ({ page }) => {
		// Sign in as the read-only user (created by global setup via seed, role defaults to client)
		await page.goto('/login');
		await page.getByLabel('Email').fill('viewer@demo.com');
		await page.getByLabel('Password').fill('viewer123!');
		await page.getByRole('button', { name: 'Sign In' }).click();
		await expect(page).toHaveURL('/');

		// Pages render (read access)…
		await page.goto('/clients');
		await expect(page.getByRole('heading', { name: 'Clients', level: 1 })).toBeVisible();

		// …but a write action is rejected with 403
		await page.goto('/clients/new');
		await page.getByLabel('Client Name').fill('Should Not Exist');
		await page.getByRole('button', { name: 'Create Client' }).click();
		await expect(page.getByText(/permission/i)).toBeVisible();

		// And the record was truly not created
		await page.goto('/clients?search=Should+Not+Exist');
		await expect(page.getByText('No clients match your filters')).toBeVisible();
	});
});

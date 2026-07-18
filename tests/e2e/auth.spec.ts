import { expect, test } from '@playwright/test';

test.describe('authentication', () => {
	test('redirects unauthenticated visitors to login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('heading', { name: 'Energy Management Platform' })).toBeVisible();
	});

	test('rejects invalid credentials', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').fill('admin@demo.com');
		await page.getByLabel('Password').fill('wrong-password');
		await page.getByRole('button', { name: 'Sign In' }).click();
		await expect(page.getByRole('alert')).toContainText('Invalid email or password');
		await expect(page).toHaveURL(/\/login/);
	});

	test('signs in and out with valid credentials', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').fill('admin@demo.com');
		await page.getByLabel('Password').fill('admin123!');
		await page.getByRole('button', { name: 'Sign In' }).click();

		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
		await expect(page.getByRole('complementary').getByText('Admin User')).toBeVisible();

		await page.getByRole('button', { name: 'Logout' }).click();
		await expect(page).toHaveURL(/\/login/);

		// Session is really gone: protected page bounces back to login
		await page.goto('/clients');
		await expect(page).toHaveURL(/\/login/);
	});
});

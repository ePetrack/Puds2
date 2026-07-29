import { expect, test, type Page } from '@playwright/test';

/**
 * Reproduction for `ANALYSIS-1` — kept executable so nobody has to re-derive it.
 *
 * Perspective registers `<perspective-viewer>` from *inside* its WASM (a wasm-bindgen
 * `bootstrap` callback). When that WASM doesn't instantiate, the module import still
 * resolves, the element is silently never defined, and `/analysis` renders "Missing
 * perspective-client.wasm" — with no console output, no page error and no failed request to
 * point at.
 *
 * The trigger is any earlier page load in the same browser process, which is why the
 * ordinary `/analysis` spec in `m4-modules.spec.ts` passes while the page is broken in
 * practice: it happens to run first. The two tests below reproduce that ordering on purpose.
 *
 * The assertion is `test.fixme` because the bug is real and unfixed — see `ANALYSIS-1` in
 * TODO.md for the root cause and the attempts already ruled out. Lift the `fixme` as part of
 * fixing it; it is the regression test.
 */

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@demo.com');
	await page.getByLabel('Password').fill('admin123!');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('analysis engine boot', () => {
	// Not a meaningful assertion on its own — it exists so the test below is not the first
	// page load in the browser process, which is the condition that triggers the failure.
	test('warm-up: an earlier page load in the same browser process', async ({ page }) => {
		await signIn(page);
		await page.goto('/clients');
		await expect(page).toHaveURL(/clients/);
	});

	test.fixme('registers the custom element and reports no load error', async ({ page }) => {
		await signIn(page);
		await page.goto('/analysis');

		// The element registering is the precise thing that fails; asserting on the spinner
		// alone would not distinguish this from a slow load.
		await expect
			.poll(() => page.evaluate(() => !!customElements.get('perspective-viewer')), {
				timeout: 20000
			})
			.toBe(true);

		await expect(page.getByText('Missing perspective-client.wasm')).toHaveCount(0);
		await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 20000 });
	});
});

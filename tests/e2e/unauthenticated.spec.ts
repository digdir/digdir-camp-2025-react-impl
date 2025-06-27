import { expect, test } from '@playwright/test';

// This test file is for testing unauthenticated users.
// To reach this state, reset the storage state that contains an authenticated user.
test.use({ storageState: { cookies: [], origins: [] } });

test('Is redirected to login on first visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveTitle('Digdir Selvbetjening - Logg inn');
});

test('Accessing a protected route redirects to login', async ({ page }) => {
    await page.goto('/clients');

    await expect(page).toHaveURL('/login');
});

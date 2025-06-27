import { expect, test } from '@playwright/test';

// This test file is for testing an authenticated user.
test('Has title', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/'); // Ensure user isn't redirected to /clients

    await expect(page).toHaveTitle('Digdir Selvbetjening');
});

test('Accessing the home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/'); // Ensure user isn't redirected to /clients

    await expect(page.getByRole('link', { name: 'Scopes' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Klienter' })).toBeVisible();
});

test('Accessing clients list', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/'); // Ensure user isn't redirected to /clients

    await page.getByRole('link', { name: 'Klienter' }).click();
    await page.waitForURL('/clients');
});

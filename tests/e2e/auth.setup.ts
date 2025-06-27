import path from 'path';
import { fileURLToPath } from 'url';

import { test as setup } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // Trigger log in from Selvbetjening
    await page.goto('/auth/login?useSyntheticUser');

    // Wait until we are redirected to Ansattporten
    await page.waitForURL('https://login.ansattporten.dev/authorize/selector');

    // Select TestID
    const authOption = await page.waitForSelector('a[href="/authorize/testid1"]');
    await authOption.click();

    // Wait until we are redirected to TestId
    await page.waitForURL('https://testid.ansattporten.dev/authorize**');

    // Set PID and authenticate
    await page.fill('input[name="pid"]', '66913500467');
    await page.locator('text=Autentiser').click();

    // Now wait until we are redirected back to the application, and it has set all cookies.
    await page.waitForURL('/');

    await page.context().storageState({ path: authFile });
});

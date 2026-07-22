const { test, expect } = require('@playwright/test');

/**
 * Cross-domain session persistence tests.
 *
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD when running against live deployments.
 */

test.describe('Cross-Domain Session Persistence', () => {
  test('should persist session tokens in localStorage after dashboard login', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    test.skip(!email || !password, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.kdpsuite.com';

    await page.goto(`${dashboardUrl}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(`${dashboardUrl}/**`, { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('kdp_session_token'));
    const refresh = await page.evaluate(() => localStorage.getItem('kdp_session_refresh'));
    const userId = await page.evaluate(() => localStorage.getItem('kdp_session_user_id'));

    expect(token).toBeTruthy();
    expect(refresh).toBeTruthy();
    expect(userId).toBeTruthy();
  });

  test('should remain authenticated after dashboard refresh', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    test.skip(!email || !password, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.kdpsuite.com';

    await page.goto(`${dashboardUrl}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForURL(`${dashboardUrl}/`, { timeout: 15000 });

    await page.reload({ waitUntil: 'networkidle' });

    const loginForm = page.locator('input[type="email"]');
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
  });

  test('should maintain session when navigating marketing to dashboard', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    test.skip(!email || !password, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');

    const baseUrl = process.env.BASE_URL || 'https://kdpsuite.com';
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.kdpsuite.com';

    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' }).catch(async () => {
      await page.goto(`${dashboardUrl}/login`, { waitUntil: 'networkidle' });
    });

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await page.waitForTimeout(2000);
    }

    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

    const token = await page.evaluate(() => localStorage.getItem('kdp_session_token'));
    const loginForm = page.locator('input[type="email"]');

    if (token) {
      await expect(loginForm).not.toBeVisible({ timeout: 5000 });
    } else {
      await expect(loginForm).toBeVisible({ timeout: 5000 });
    }
  });
});

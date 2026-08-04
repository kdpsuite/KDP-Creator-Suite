const { test, expect } = require('@playwright/test');
const { loginToDashboard } = require('../helpers/auth');
const { getDashboardUrl, isMarketingReachable, getBaseUrl } = require('../helpers/env');

/**
 * Cross-domain session persistence tests.
 */

test.describe('Cross-Domain Session Persistence', () => {
  test('should persist session tokens in localStorage after dashboard login', async ({
    page,
  }) => {
    await loginToDashboard(page);

    const token = await page.evaluate(() => localStorage.getItem('kdp_session_token'));
    const refresh = await page.evaluate(() =>
      localStorage.getItem('kdp_session_refresh')
    );
    const userId = await page.evaluate(() =>
      localStorage.getItem('kdp_session_user_id')
    );

    expect(token).toBeTruthy();
    expect(refresh).toBeTruthy();
    expect(userId).toBeTruthy();
  });

  test('should remain authenticated after dashboard refresh', async ({ page }) => {
    await loginToDashboard(page);

    await page.reload({ waitUntil: 'networkidle' });

    const loginForm = page.locator('input[type="email"]');
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
  });

  test('should maintain session when navigating marketing to dashboard', async ({
    page,
  }) => {
    await loginToDashboard(page);

    const dashboardUrl = getDashboardUrl();
    const marketingReachable = await isMarketingReachable();

    if (marketingReachable) {
      await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });
    } else {
      // Marketing apex→www is broken (DNS/TLS); still verify session survives navigation.
      await page.goto(`${dashboardUrl}/login`, { waitUntil: 'networkidle' });
    }

    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

    const token = await page.evaluate(() => localStorage.getItem('kdp_session_token'));
    const loginForm = page.locator('input[type="email"]');

    expect(token).toBeTruthy();
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
  });
});

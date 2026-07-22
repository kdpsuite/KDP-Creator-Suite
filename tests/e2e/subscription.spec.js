const { test, expect } = require('@playwright/test');
const { loginToDashboard, authApiRequest } = require('../helpers/auth');
const { getDashboardUrl } = require('../helpers/env');

test.describe('KDP Creator Suite - Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await loginToDashboard(page);
  });

  test('should display subscription tier on overview', async ({ page }) => {
    await page.getByRole('tab', { name: 'Overview' }).click();

    await expect(page.getByText('Subscription', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Monthly Usage')).toBeVisible();

    const tierHeading = page.locator('text=Subscription').locator('xpath=ancestor::div[contains(@class,"card") or contains(@class,"Card")]').first();
    await expect(tierHeading).toBeVisible();

    const tierName = tierHeading.locator('.text-2xl.font-bold');
    await expect(tierName).toBeVisible();
    await expect(tierName).not.toHaveText('');
  });

  test('should show usage progress against subscription limits', async ({ page }) => {
    await page.getByRole('tab', { name: 'Overview' }).click();

    const usageLabel = page.getByText('Monthly Usage');
    await expect(usageLabel).toBeVisible();

    const usageValue = page.getByText(/\d+ \/ (Unlimited|\d+)/);
    await expect(usageValue.first()).toBeVisible();
  });

  test('should return subscription status from API', async ({ page }) => {
    const response = await authApiRequest(page, 'GET', '/status');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const payload = body.data ?? body;

    expect(payload).toHaveProperty('tier');
    expect(payload).toHaveProperty('tier_details');
    expect(payload.tier_details).toHaveProperty('name');
    expect(payload).toHaveProperty('current_usage');
    expect(payload.current_usage).toHaveProperty('conversions');
    expect(payload).toHaveProperty('remaining_usage');
    expect(payload.remaining_usage).toHaveProperty('conversions');
  });

  test('should expose public subscription tiers', async ({ page }) => {
    const dashboardUrl = getDashboardUrl();
    const response = await page.request.get(`${dashboardUrl}/api/tiers`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const payload = body.data ?? body;

    expect(payload.tiers).toBeDefined();
    expect(payload.tiers.free).toBeDefined();
    expect(payload.tiers.pro).toBeDefined();
    expect(payload.tiers.studio).toBeDefined();
    expect(payload.tiers.free.name).toBe('Free');
  });

  test('should reject unauthenticated subscription status requests', async ({ page }) => {
    const dashboardUrl = getDashboardUrl();
    const response = await page.request.get(`${dashboardUrl}/api/status`);
    expect(response.status()).toBe(401);
  });
});

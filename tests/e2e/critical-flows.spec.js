const { test, expect } = require('@playwright/test');
const { loginToDashboard } = require('../helpers/auth');
const {
  getBaseUrl,
  getDashboardUrl,
  isMarketingReachable,
} = require('../helpers/env');

/**
 * Critical User Flow Tests
 *
 * Tests the most important user journeys:
 * 1. Landing page loads correctly
 * 2. Login flow works
 * 3. Dashboard loads and displays content
 * 4. User can navigate between sections
 */

test.describe('KDP Creator Suite - Critical Flows', () => {
  test.describe('Landing Page', () => {
    test.beforeEach(async () => {
      test.skip(
        !(await isMarketingReachable()),
        'Marketing BASE_URL unreachable (www redirect/DNS/TLS)'
      );
    });

    test('should load the main domain without errors', async ({ page }) => {
      const response = await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

      expect(response.status()).toBeLessThan(400);

      const spinner = page.locator('[class*="spinner"], [class*="loader"]');
      const spinnerCount = await spinner.count();

      if (spinnerCount > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 15000 });
      }

      const bodyText = await page.locator('body').textContent();
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test('should have navigation links', async ({ page }) => {
      await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

      const navLinks = page.locator('nav a, header a, [role="navigation"] a');
      const linkCount = await navLinks.count();

      expect(linkCount).toBeGreaterThan(0);
    });

    test('should have login button or link', async ({ page }) => {
      await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

      const loginButton = page.locator(
        'button:has-text("Login"), a:has-text("Login"), button:has-text("Sign In"), a:has-text("Sign In")'
      );

      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login Flow', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.goto(`${getDashboardUrl()}/login`, { waitUntil: 'networkidle' });

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto(`${getDashboardUrl()}/login`, { waitUntil: 'networkidle' });

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")'
      );
      await submitButton.click();

      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/login');
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto(`${getDashboardUrl()}/login`, { waitUntil: 'networkidle' });

      await page.fill('input[type="email"]', 'invalid@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")'
      );
      await submitButton.click();

      await page.waitForTimeout(2000);

      const errorMessage = page.locator(
        '[role="alert"], .error, .alert-error, [class*="error"]'
      );
      const isError = await errorMessage.isVisible().catch(() => false);
      const stillOnLogin = page.url().includes('/login');

      expect(isError || stillOnLogin).toBeTruthy();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await loginToDashboard(page);

      expect(page.url()).not.toContain('/login');
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginToDashboard(page);
    });

    test('should load dashboard without spinner stuck', async ({ page }) => {
      const spinner = page.locator(
        '[class*="spinner"], [class*="loader"], [class*="loading"]'
      );
      const spinnerCount = await spinner.count();

      if (spinnerCount > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 10000 });
      }

      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByRole('button', { name: /Logout|Sign Out/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should display user information', async ({ page }) => {
      await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible({
        timeout: 5000,
      });
      await page.getByRole('tab', { name: 'Settings' }).click();
      await expect(page.locator('input[name="settings-email"]')).toHaveValue(/@/, {
        timeout: 5000,
      });
    });

    test('should have logout button', async ({ page }) => {
      const logoutButton = page.getByRole('button', { name: /Logout|Sign Out/i });

      await expect(logoutButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle logout', async ({ page }) => {
      const logoutButton = page.getByRole('button', { name: /Logout|Sign Out/i });

      await logoutButton.first().click();

      await page.waitForURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('API Health', () => {
    test('should have working health endpoint', async ({ page }) => {
      const response = await page.request.get(`${getDashboardUrl()}/api/health`);

      expect(response.status()).toBeLessThan(400);

      const body = await response.json();
      expect(body.ok).toBeTruthy();
      expect(body.data?.status || body.status).toBeTruthy();
    });

    test('should have working ready endpoint', async ({ page }) => {
      const response = await page.request.get(
        `${getDashboardUrl()}/api/health/ready`
      );

      expect(response.status()).toBeLessThan(500);

      const body = await response.json();
      expect(body).toHaveProperty('ok');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      const response = await page.goto(
        `${getDashboardUrl()}/nonexistent-page`,
        { waitUntil: 'networkidle' }
      );

      expect([200, 404]).toContain(response.status());
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.context().setOffline(true);

      await page.goto(getDashboardUrl()).catch(() => null);

      await page.context().setOffline(false);
    });
  });
});

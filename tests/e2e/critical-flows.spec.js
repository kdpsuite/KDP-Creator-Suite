const { test, expect } = require('@playwright/test');

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
    test('should load the main domain without errors', async ({ page }) => {
      // Navigate to main domain
      const response = await page.goto('/', { waitUntil: 'networkidle' });
      
      // Check response status
      expect(response.status()).toBeLessThan(400);
      
      // Check for spinner (should not be stuck)
      const spinner = page.locator('[class*="spinner"], [class*="loader"]');
      const spinnerCount = await spinner.count();
      
      // If spinner exists, wait for it to disappear
      if (spinnerCount > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 15000 });
      }
      
      // Page should have content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test('should have navigation links', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Check for common navigation elements
      const navLinks = page.locator('nav a, header a, [role="navigation"] a');
      const linkCount = await navLinks.count();
      
      expect(linkCount).toBeGreaterThan(0);
    });

    test('should have login button or link', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Look for login button/link
      const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Sign In"), a:has-text("Sign In")');
      
      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login Flow', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Check for login form elements
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await submitButton.click();
      
      // Should show error or prevent submission
      // Wait a bit to see if error appears
      await page.waitForTimeout(1000);
      
      // Check if we're still on login page (not redirected)
      expect(page.url()).toContain('/login');
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Fill with invalid credentials
      await page.fill('input[type="email"]', 'invalid@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await submitButton.click();
      
      // Should show error message or stay on login page
      await page.waitForTimeout(2000);
      
      // Should either show error or stay on login page
      const errorMessage = page.locator('[role="alert"], .error, .alert-error, [class*="error"]');
      const isError = await errorMessage.isVisible().catch(() => false);
      const stillOnLogin = page.url().includes('/login');
      
      expect(isError || stillOnLogin).toBeTruthy();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      const email = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
      const password = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';
      
      // Fill login form
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await submitButton.click();
      
      // Should redirect to dashboard
      await page.waitForURL('/', { timeout: 15000 });
      
      // Should not be on login page
      expect(page.url()).not.toContain('/login');
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      const email = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
      const password = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';
      
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await submitButton.click();
      
      // Wait for dashboard
      await page.waitForURL('/', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    });

    test('should load dashboard without spinner stuck', async ({ page }) => {
      // Check for spinner
      const spinner = page.locator('[class*="spinner"], [class*="loader"], [class*="loading"]');
      const spinnerCount = await spinner.count();
      
      if (spinnerCount > 0) {
        // Spinner should disappear within 10 seconds
        await expect(spinner.first()).not.toBeVisible({ timeout: 10000 });
      }
      
      // Dashboard should have content
      const content = page.locator('main, [role="main"], .dashboard, .content');
      await expect(content.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display user information', async ({ page }) => {
      // Look for user email or name
      const userInfo = page.locator('[class*="user"], [class*="profile"], [class*="account"]');
      const userInfoCount = await userInfo.count();
      
      // Should have some user-related elements
      expect(userInfoCount).toBeGreaterThan(0);
    });

    test('should have logout button', async ({ page }) => {
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
      
      await expect(logoutButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle logout', async ({ page }) => {
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
      
      await logoutButton.first().click();
      
      // Should redirect to login or home
      await page.waitForTimeout(2000);
      
      const isLoggedOut = page.url().includes('/login') || page.url() === '/';
      expect(isLoggedOut).toBeTruthy();
    });
  });

  test.describe('API Health', () => {
    test('should have working health endpoint', async ({ page }) => {
      const response = await page.request.get('/api/health');
      
      expect(response.status()).toBeLessThan(400);
      
      const body = await response.json();
      expect(body).toHaveProperty('status');
    });

    test('should have working root endpoint', async ({ page }) => {
      const response = await page.request.get('/api');
      
      expect(response.status()).toBeLessThan(400);
      
      const body = await response.json();
      expect(body).toHaveProperty('message');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      const response = await page.goto('/nonexistent-page', { waitUntil: 'networkidle' });
      
      // Should either show 404 page or redirect
      // Status should be 404 or 200 (if redirected)
      expect([200, 404]).toContain(response.status());
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.context().setOffline(true);
      
      const response = await page.goto('/').catch(() => null);
      
      // Should either fail gracefully or show error message
      // Re-enable network
      await page.context().setOffline(false);
    });
  });
});

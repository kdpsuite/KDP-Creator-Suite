const { test: base } = require('@playwright/test');

/**
 * Fixture for authenticated user
 * 
 * Provides a pre-authenticated page context for tests that require login
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in login credentials
    const email = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Click login button
    await page.click('button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 15000 });
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    
    // Use the authenticated page in the test
    await use(page);
    
    // Cleanup: logout
    try {
      await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    } catch (e) {
      // Logout button may not exist, that's okay
    }
  },
});

export { expect } from '@playwright/test';

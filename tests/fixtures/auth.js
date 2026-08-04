const { test: base } = require('@playwright/test');
const { loginToDashboard } = require('../helpers/auth');

/**
 * Fixture for authenticated user
 *
 * Provides a pre-authenticated page context for tests that require login
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await loginToDashboard(page);

    await use(page);

    try {
      await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    } catch (e) {
      // Logout button may not exist, that's okay
    }
  },
});

export { expect } from '@playwright/test';

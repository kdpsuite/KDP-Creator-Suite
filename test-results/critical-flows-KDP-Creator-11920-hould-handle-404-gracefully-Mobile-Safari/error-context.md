# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.js >> KDP Creator Suite - Critical Flows >> Error Handling >> should handle 404 gracefully
- Location: tests/e2e/critical-flows.spec.js:211:5

# Error details

```
Error: page.goto: Error resolving “www.kdpsuite.com”: Name or service not known
Call log:
  - navigating to "https://kdpsuite.com/nonexistent-page", waiting until "networkidle"

```

# Test source

```ts
  112 |       // Fill login form
  113 |       await page.fill('input[type="email"]', email);
  114 |       await page.fill('input[type="password"]', password);
  115 |       
  116 |       // Submit
  117 |       const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  118 |       await submitButton.click();
  119 |       
  120 |       // Should redirect to dashboard
  121 |       await page.waitForURL('/', { timeout: 15000 });
  122 |       
  123 |       // Should not be on login page
  124 |       expect(page.url()).not.toContain('/login');
  125 |     });
  126 |   });
  127 | 
  128 |   test.describe('Dashboard', () => {
  129 |     test.beforeEach(async ({ page }) => {
  130 |       // Login before each test
  131 |       await page.goto('https://dashboard.kdpsuite.com/login', { waitUntil: 'networkidle' });
  132 |       
  133 |       const email = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
  134 |       const password = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';
  135 |       
  136 |       await page.fill('input[type="email"]', email);
  137 |       await page.fill('input[type="password"]', password);
  138 |       
  139 |       const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  140 |       await submitButton.click();
  141 |       
  142 |       // Wait for dashboard
  143 |       await page.waitForURL('/', { timeout: 15000 });
  144 |       await page.waitForLoadState('networkidle');
  145 |     });
  146 | 
  147 |     test('should load dashboard without spinner stuck', async ({ page }) => {
  148 |       // Check for spinner
  149 |       const spinner = page.locator('[class*="spinner"], [class*="loader"], [class*="loading"]');
  150 |       const spinnerCount = await spinner.count();
  151 |       
  152 |       if (spinnerCount > 0) {
  153 |         // Spinner should disappear within 10 seconds
  154 |         await expect(spinner.first()).not.toBeVisible({ timeout: 10000 });
  155 |       }
  156 |       
  157 |       // Dashboard should have content
  158 |       const content = page.locator('main, [role="main"], .dashboard, .content');
  159 |       await expect(content.first()).toBeVisible({ timeout: 5000 });
  160 |     });
  161 | 
  162 |     test('should display user information', async ({ page }) => {
  163 |       // Look for user email or name
  164 |       const userInfo = page.locator('[class*="user"], [class*="profile"], [class*="account"]');
  165 |       const userInfoCount = await userInfo.count();
  166 |       
  167 |       // Should have some user-related elements
  168 |       expect(userInfoCount).toBeGreaterThan(0);
  169 |     });
  170 | 
  171 |     test('should have logout button', async ({ page }) => {
  172 |       const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
  173 |       
  174 |       await expect(logoutButton.first()).toBeVisible({ timeout: 5000 });
  175 |     });
  176 | 
  177 |     test('should handle logout', async ({ page }) => {
  178 |       const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
  179 |       
  180 |       await logoutButton.first().click();
  181 |       
  182 |       // Should redirect to login or home
  183 |       await page.waitForTimeout(2000);
  184 |       
  185 |       const isLoggedOut = page.url().includes('/login') || page.url().includes('kdpsuite.com');
  186 |       expect(isLoggedOut).toBeTruthy();
  187 |     });
  188 |   });
  189 | 
  190 |   test.describe('API Health', () => {
  191 |     test('should have working health endpoint', async ({ page }) => {
  192 |       const response = await page.request.get('https://dashboard.kdpsuite.com/api/health');
  193 |       
  194 |       expect(response.status()).toBeLessThan(400);
  195 |       
  196 |       const body = await response.json();
  197 |       expect(body).toHaveProperty('status');
  198 |     });
  199 | 
  200 |     test('should have working root endpoint', async ({ page }) => {
  201 |       const response = await page.request.get('https://dashboard.kdpsuite.com/api');
  202 |       
  203 |       expect(response.status()).toBeLessThan(400);
  204 |       
  205 |       const body = await response.json();
  206 |       expect(body).toHaveProperty('message');
  207 |     });
  208 |   });
  209 | 
  210 |   test.describe('Error Handling', () => {
  211 |     test('should handle 404 gracefully', async ({ page }) => {
> 212 |       const response = await page.goto('/nonexistent-page', { waitUntil: 'networkidle' });
      |                                   ^ Error: page.goto: Error resolving “www.kdpsuite.com”: Name or service not known
  213 |       
  214 |       // Should either show 404 page or redirect
  215 |       // Status should be 404 or 200 (if redirected)
  216 |       expect([200, 404]).toContain(response.status());
  217 |     });
  218 | 
  219 |     test('should handle network errors gracefully', async ({ page }) => {
  220 |       // Simulate network error
  221 |       await page.context().setOffline(true);
  222 |       
  223 |       const response = await page.goto('/').catch(() => null);
  224 |       
  225 |       // Should either fail gracefully or show error message
  226 |       // Re-enable network
  227 |       await page.context().setOffline(false);
  228 |     });
  229 |   });
  230 | });
  231 | 
```
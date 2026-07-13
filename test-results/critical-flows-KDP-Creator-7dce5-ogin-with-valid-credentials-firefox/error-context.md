# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.js >> KDP Creator Suite - Critical Flows >> Login Flow >> should successfully login with valid credentials
- Location: tests/e2e/critical-flows.spec.js:106:5

# Error details

```
Error: page.goto: NS_ERROR_UNKNOWN_HOST
Call log:
  - navigating to "https://kdpsuite.com/login", waiting until "networkidle"

```

# Page snapshot

```yaml
- article "Server Not Found" [ref=e3]:
  - img "Illustration of a fox looking at disconnected network cables." [ref=e5]
  - generic [ref=e7]:
    - heading "Server Not Found" [level=1] [ref=e8]
    - paragraph [ref=e9]:
      - text: Nightly can’t connect to the server at
      - strong [ref=e10]: www.kdpsuite.com
    - generic [ref=e11]:
      - heading "What can you do about it?" [level=3] [ref=e12]
      - paragraph [ref=e13]: Try connecting on a different device. Check your modem or router. Disconnect and reconnect to Wi-Fi.
    - paragraph [ref=e14]:
      - link "Learn more…" [ref=e15] [cursor=pointer]:
        - /url: https://support.mozilla.org/1/firefox/151.0/Linux/en-US/server-not-found-connection-problem
    - button "Try Again" [ref=e18]:
      - generic [ref=e20]:
        - generic: Try Again
```

# Test source

```ts
  7   |  * 1. Landing page loads correctly
  8   |  * 2. Login flow works
  9   |  * 3. Dashboard loads and displays content
  10  |  * 4. User can navigate between sections
  11  |  */
  12  | 
  13  | test.describe('KDP Creator Suite - Critical Flows', () => {
  14  |   
  15  |   test.describe('Landing Page', () => {
  16  |     test('should load the main domain without errors', async ({ page }) => {
  17  |       // Navigate to main domain
  18  |       const response = await page.goto('https://kdpsuite.com', { waitUntil: 'networkidle' });
  19  |       
  20  |       // Check response status
  21  |       expect(response.status()).toBeLessThan(400);
  22  |       
  23  |       // Check for spinner (should not be stuck)
  24  |       const spinner = page.locator('[class*="spinner"], [class*="loader"]');
  25  |       const spinnerCount = await spinner.count();
  26  |       
  27  |       // If spinner exists, wait for it to disappear
  28  |       if (spinnerCount > 0) {
  29  |         await expect(spinner.first()).not.toBeVisible({ timeout: 15000 });
  30  |       }
  31  |       
  32  |       // Page should have content
  33  |       const bodyText = await page.locator('body').textContent();
  34  |       expect(bodyText.length).toBeGreaterThan(0);
  35  |     });
  36  | 
  37  |     test('should have navigation links', async ({ page }) => {
  38  |       await page.goto('/', { waitUntil: 'networkidle' });
  39  |       
  40  |       // Check for common navigation elements
  41  |       const navLinks = page.locator('nav a, header a, [role="navigation"] a');
  42  |       const linkCount = await navLinks.count();
  43  |       
  44  |       expect(linkCount).toBeGreaterThan(0);
  45  |     });
  46  | 
  47  |     test('should have login button or link', async ({ page }) => {
  48  |       await page.goto('/', { waitUntil: 'networkidle' });
  49  |       
  50  |       // Look for login button/link
  51  |       const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Sign In"), a:has-text("Sign In")');
  52  |       
  53  |       await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
  54  |     });
  55  |   });
  56  | 
  57  |   test.describe('Login Flow', () => {
  58  |     test('should navigate to login page', async ({ page }) => {
  59  |       await page.goto('https://dashboard.kdpsuite.com/login', { waitUntil: 'networkidle' });
  60  |       
  61  |       // Check for login form elements
  62  |       const emailInput = page.locator('input[type="email"]');
  63  |       const passwordInput = page.locator('input[type="password"]');
  64  |       
  65  |       await expect(emailInput).toBeVisible({ timeout: 5000 });
  66  |       await expect(passwordInput).toBeVisible({ timeout: 5000 });
  67  |     });
  68  | 
  69  |     test('should show validation errors for empty form', async ({ page }) => {
  70  |       await page.goto('/login', { waitUntil: 'networkidle' });
  71  |       
  72  |       // Try to submit empty form
  73  |       const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  74  |       await submitButton.click();
  75  |       
  76  |       // Should show error or prevent submission
  77  |       // Wait a bit to see if error appears
  78  |       await page.waitForTimeout(1000);
  79  |       
  80  |       // Check if we're still on login page (not redirected)
  81  |       expect(page.url()).toContain('/login');
  82  |     });
  83  | 
  84  |     test('should reject invalid credentials', async ({ page }) => {
  85  |       await page.goto('/login', { waitUntil: 'networkidle' });
  86  |       
  87  |       // Fill with invalid credentials
  88  |       await page.fill('input[type="email"]', 'invalid@test.com');
  89  |       await page.fill('input[type="password"]', 'wrongpassword');
  90  |       
  91  |       // Submit
  92  |       const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  93  |       await submitButton.click();
  94  |       
  95  |       // Should show error message or stay on login page
  96  |       await page.waitForTimeout(2000);
  97  |       
  98  |       // Should either show error or stay on login page
  99  |       const errorMessage = page.locator('[role="alert"], .error, .alert-error, [class*="error"]');
  100 |       const isError = await errorMessage.isVisible().catch(() => false);
  101 |       const stillOnLogin = page.url().includes('/login');
  102 |       
  103 |       expect(isError || stillOnLogin).toBeTruthy();
  104 |     });
  105 | 
  106 |     test('should successfully login with valid credentials', async ({ page }) => {
> 107 |       await page.goto('/login', { waitUntil: 'networkidle' });
      |                  ^ Error: page.goto: NS_ERROR_UNKNOWN_HOST
  108 |       
  109 |       const email = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
  110 |       const password = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';
  111 |       
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
```
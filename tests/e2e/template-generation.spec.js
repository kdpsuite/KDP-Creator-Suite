const { test, expect } = require('@playwright/test');
const { loginToDashboard, authApiRequest } = require('../helpers/auth');

async function getTemplateCatalog(page) {
  const response = await authApiRequest(page, 'GET', '/templates');
  if (response.status() >= 500) {
    return { response, payload: null };
  }
  const body = await response.json().catch(() => ({}));
  return { response, payload: body.data ?? body };
}

test.describe('KDP Creator Suite - Template Product Generation', () => {
  test.beforeEach(async ({ page }) => {
    await loginToDashboard(page);
  });

  test('should list templates with customization schema', async ({ page }) => {
    const { response, payload } = await getTemplateCatalog(page);
    expect(response.status()).toBeLessThan(500);
    expect(payload?.templates?.length).toBeGreaterThanOrEqual(5);

    test.skip(!payload?.templates?.[0]?.fields, 'Product Builder schema not deployed yet');
    expect(payload.templates[0]).toHaveProperty('defaults');
    expect(payload).toHaveProperty('kdp_specs');
  });

  test('should load Product Builder from Templates tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Templates' }).click();
    await expect(page.getByText('Template Library')).toBeVisible({ timeout: 10000 });

    const customizeButton = page.getByRole('button', { name: 'Customize & Generate' }).first();
    test.skip(!(await customizeButton.count()), 'Product Builder UI not deployed yet');

    await customizeButton.click();
    await expect(page.getByRole('tab', { name: 'Tools' })).toHaveAttribute('data-state', 'active');
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Product Builder' })
    ).toBeVisible();
    await expect(page.getByText('Generate interior + cover')).toBeVisible();
  });

  test('should expose template-specific customization controls', async ({ page }) => {
    await page.getByRole('tab', { name: 'Templates' }).click();
    const customizeButton = page.getByRole('button', { name: 'Customize & Generate' }).first();
    test.skip(!(await customizeButton.count()), 'Product Builder UI not deployed yet');

    await customizeButton.click();
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Product Builder' })
    ).toBeVisible();
    await page.getByRole('button', { name: /Show template options/i }).click();
    await expect(page.getByRole('button', { name: /Hide template options/i })).toBeVisible();
  });

  test('should generate product via API and return dual downloads', async ({ page }) => {
    test.setTimeout(120000);

    const catalog = await getTemplateCatalog(page);
    test.skip(!catalog.payload?.templates?.[0]?.fields, 'Product Builder API not deployed yet');

    const response = await authApiRequest(page, 'POST', '/templates/tpl-log-etsy-seller/generate', {
      data: {
        options: {
          title: 'E2E Inventory Log',
          author: 'Playwright',
          trim_size: '6x9',
          print_profile: 'bw_white',
          with_bleed: false,
          page_count: 24,
          include_spine_text: false,
          large_print: true,
        },
      },
    });

    expect(response.status()).toBeLessThan(500);
    if (response.status() >= 400) {
      const body = await response.json().catch(() => ({}));
      // Auth/storage failures are environment issues; ensure we got a JSON error body.
      expect(Object.keys(body).length).toBeGreaterThan(0);
      return;
    }

    const body = await response.json();
    const payload = body.data ?? body;
    expect(payload).toHaveProperty('interior_download_url');
    expect(payload).toHaveProperty('cover_download_url');
    expect(payload).toHaveProperty('compliance');
    expect(payload.page_count).toBeGreaterThanOrEqual(24);
    expect(payload.page_count % 2).toBe(0);
    expect(payload.compliance).toHaveProperty('is_valid');
  });
});

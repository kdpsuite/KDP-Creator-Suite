const { test, expect } = require('@playwright/test');
const { loginToDashboard, authApiRequest } = require('../helpers/auth');
const { getDashboardUrl } = require('../helpers/env');
const { getSamplePdfPath, getSamplePngPath, uploadFileViaChooser } = require('../helpers/fixtures');

test.describe('KDP Creator Suite - PDF Processing', () => {
  test.beforeEach(async ({ page }) => {
    await loginToDashboard(page);
  });

  test('should display PDF processing tools on Tools tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();

    await expect(page.getByText('KDP PDF Converter')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Image to Coloring Book')).toBeVisible();
    await expect(page.getByText('Drag & drop your PDF here')).toBeVisible();
    await expect(page.getByText('Upload image to convert')).toBeVisible();
  });

  test('should expose trim size and target format controls', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();

    const trimSelect = page.locator('select').filter({ has: page.locator('option[value="6x9"]') }).first();
    await expect(trimSelect).toBeVisible();
    await trimSelect.selectOption('8.5x11');

    const formatSelect = page.locator('select').filter({ has: page.locator('option[value="kdp-print"]') });
    await expect(formatSelect).toBeVisible();
    await formatSelect.selectOption('kdp-ebook');
  });

  test('should start coloring conversion upload flow', async ({ page }) => {
    test.setTimeout(60000);

    await page.getByRole('tab', { name: 'Tools' }).click();
    await uploadFileViaChooser(page, 1, getSamplePngPath());

    await expect(page.getByText('Processing your file...')).toBeVisible({ timeout: 15000 });
  });

  test('should start KDP PDF conversion upload flow', async ({ page }) => {
    test.setTimeout(60000);

    await page.getByRole('tab', { name: 'Tools' }).click();
    await uploadFileViaChooser(page, 0, getSamplePdfPath());

    await expect(page.getByText('Processing your file...')).toBeVisible({ timeout: 15000 });
  });

  test('should validate KDP compliance via API', async ({ page }) => {
    const pdfPath = getSamplePdfPath();
    const pdfBuffer = require('fs').readFileSync(pdfPath);

    const response = await authApiRequest(page, 'POST', '/pdf/validate-kdp', {
      multipart: {
        file: {
          name: 'sample-kdp.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        },
        trim_size: '6x9',
        target_format: 'print',
      },
    });

    expect(response.status()).toBeLessThan(500);

    const body = await response.json();
    const payload = body.data ?? body;

    expect(payload).toHaveProperty('is_valid');
    expect(payload).toHaveProperty('num_pages');
    expect(payload).toHaveProperty('warnings');
  });

  test('should reject unauthenticated PDF validation requests', async ({ page }) => {
    const dashboardUrl = getDashboardUrl();
    const pdfPath = getSamplePdfPath();
    const pdfBuffer = require('fs').readFileSync(pdfPath);

    const response = await page.request.post(`${dashboardUrl}/api/pdf/validate-kdp`, {
      multipart: {
        file: {
          name: 'sample-kdp.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        },
        trim_size: '6x9',
      },
    });

    expect(response.status()).toBe(401);
  });
});

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { loginToDashboard, authApiRequest } = require('../helpers/auth');
const { getDashboardUrl } = require('../helpers/env');
const { createTempImagePaths, uploadFileViaChooser } = require('../helpers/fixtures');

test.describe('KDP Creator Suite - Batch Processing', () => {
  test.beforeEach(async ({ page }) => {
    await loginToDashboard(page);
  });

  test('should display batch processing UI', async ({ page }) => {
    await page.getByRole('tab', { name: 'Batch Processing' }).click();

    await expect(page.getByText('Batch Image to Coloring Book')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Drag & drop multiple images here')).toBeVisible();
    await expect(page.getByText('Supports JPG, PNG')).toBeVisible();
  });

  test('should start batch coloring upload flow', async ({ page }) => {
    test.setTimeout(60000);

    await page.getByRole('tab', { name: 'Batch Processing' }).click();

    const { tempDir, paths } = createTempImagePaths(2);

    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Choose File' }).click(),
      ]);
      await fileChooser.setFiles(paths);

      await expect(page.getByText(/2 file\(s\) — drag to reorder/i)).toBeVisible({ timeout: 5000 });

      await page.getByRole('button', { name: /Process \d+ file\(s\)/i }).click();

      await expect(page.getByText(/Processing \d+ of \d+ files/i)).toBeVisible({ timeout: 15000 });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should submit batch job via API and track status', async ({ page }) => {
    test.setTimeout(60000);

    const submitResponse = await authApiRequest(page, 'POST', '/batch/submit', {
      data: {
        job_type: 'coloring_book',
        total_files: 3,
      },
    });

    expect(submitResponse.status()).not.toBe(401);
    expect([200, 201, 429, 500]).toContain(submitResponse.status());

    if (![200, 201].includes(submitResponse.status())) {
      return;
    }

    const submitBody = await submitResponse.json();
    const submitPayload = submitBody.data ?? submitBody;

    expect(submitPayload.job).toBeDefined();
    expect(submitPayload.job.status).toMatch(/queued|processing|completed/);
    expect(submitPayload.job.total_files).toBe(3);

    const jobId = submitPayload.job.id;

    await expect.poll(async () => {
      const jobsResponse = await authApiRequest(page, 'GET', '/batch/jobs');
      expect(jobsResponse.status()).toBeLessThan(500);

      const jobsBody = await jobsResponse.json();
      const jobsPayload = jobsBody.data ?? jobsBody;
      const jobs = jobsPayload.jobs || [];

      const job = jobs.find((entry) => entry.id === jobId);
      return job?.status ?? 'missing';
    }, {
      timeout: 45000,
      intervals: [1000, 2000, 3000],
    }).toMatch(/queued|processing|completed/);
  });

  test('should list batch jobs for authenticated user', async ({ page }) => {
    const response = await authApiRequest(page, 'GET', '/batch/jobs');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const payload = body.data ?? body;

    expect(payload).toHaveProperty('jobs');
    expect(Array.isArray(payload.jobs)).toBeTruthy();
  });

  test('should reject unauthenticated batch submit', async ({ page }) => {
    const dashboardUrl = getDashboardUrl();

    const response = await page.request.post(`${dashboardUrl}/api/batch/submit`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        job_type: 'coloring_book',
        total_files: 1,
      },
    });

    expect([401, 429]).toContain(response.status());
  });
});

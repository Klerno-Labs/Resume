import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Complete User Workflow', () => {
  const testEmail = `e2e-${Date.now()}@test.com`;
  const testPassword = 'E2ESecurePass123!@#';

  test('should complete full resume optimization flow', async ({ page }) => {
    // 1. Registration
    await page.goto('http://localhost:5000/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('text=/welcome/i')).toBeVisible({ timeout: 5000 });

    // 2. Verify welcome credits
    const initialCredits = await page.locator('[data-testid="credits-remaining"]').textContent();
    expect(parseInt(initialCredits || '0', 10)).toBeGreaterThan(0);

    // 3. Upload Resume
    await page.click('text=/upload.*resume/i');
    const resumePath = path.join(__dirname, '../fixtures/sample-resume.pdf');
    await page.setInputFiles('input[type="file"]', resumePath);
    await page.click('button:has-text("Upload")');

    await expect(page.locator('text=/processing/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/analysis.*complete/i')).toBeVisible({ timeout: 60000 });

    // 4. View ATS Score
    const atsScore = await page.locator('[data-testid=ats-score]').textContent();
    const score = parseInt(atsScore || '0', 10);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    // 5. View Improvements
    await expect(page.locator('text=/suggested.*improvement/i')).toBeVisible();
    const improvementCount = await page.locator('[data-testid=improvement-item]').count();
    expect(improvementCount).toBeGreaterThan(0);

    // 6. Generate Cover Letter
    await page.click('text=/generate.*cover.*letter/i');
    await page.fill(
      'textarea[name="jobDescription"]',
      'Senior Software Engineer at Tech Corp. Requirements: 5+ years experience with React, Node.js, and AWS.'
    );
    await page.click('button:has-text("Generate")');

    await expect(page.locator('text=/cover.*letter.*generated/i')).toBeVisible({ timeout: 30000 });
    const coverLetterContent = await page
      .locator('[data-testid=cover-letter-content]')
      .textContent();
    expect((coverLetterContent || '').length).toBeGreaterThan(100);

    // 7. Verify Credits Deducted
    const finalCredits = await page.locator('[data-testid="credits-remaining"]').textContent();
    expect(parseInt(finalCredits || '0', 10)).toBeLessThan(parseInt(initialCredits || '0', 10));
  });

  test('should enforce credit limits', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.fill('input[name="email"]', `nocredits-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    const creditsText = await page.locator('[data-testid="credits-remaining"]').textContent();
    const credits = parseInt(creditsText || '0', 10);

    for (let i = 0; i < credits; i++) {
      await page.click('text=/upload.*resume/i');
      await page.setInputFiles(
        'input[type="file"]',
        path.join(__dirname, '../fixtures/sample-resume.pdf')
      );
      await page.click('button:has-text("Upload")');
      await page.waitForTimeout(2000);
    }

    await page.click('text=/upload.*resume/i');
    await page.setInputFiles(
      'input[type="file"]',
      path.join(__dirname, '../fixtures/sample-resume.pdf')
    );
    await page.click('button:has-text("Upload")');

    await expect(page.locator('text=/insufficient.*credit/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/upgrade.*plan/i')).toBeVisible();
  });

  test('should handle payment upgrade flow', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.fill('input[name="email"]', `upgrade-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    await page.click('text=/upgrade/i');
    await expect(page.locator('text=/pricing/i')).toBeVisible();

    await page.click('button:has-text("Choose Pro")');

    await expect(page).toHaveURL(/stripe\.com|checkout/, { timeout: 10000 });
  });
});

test.describe('Error Handling', () => {
  test('should display user-friendly error for network issues', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('http://localhost:5000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/network.*error|connection.*failed/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle malformed file uploads gracefully', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('http://localhost:5000/register');
    await page.fill('input[name="email"]', `error-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    await page.click('text=/upload.*resume/i');
    await page.setInputFiles(
      'input[type="file"]',
      path.join(__dirname, '../fixtures/malformed.txt')
    );
    await page.click('button:has-text("Upload")');

    await expect(page.locator('text=/invalid.*file.*type/i')).toBeVisible({ timeout: 5000 });
  });
});

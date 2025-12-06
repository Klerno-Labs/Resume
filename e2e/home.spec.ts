import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/resume/i);
  });

  test('should display main features', async ({ page }) => {
    await page.goto('/');

    // Should show hero section
    await expect(page.locator('h1').first()).toBeVisible();

    // Should have upload or get started button
    const ctaButton = page.locator('button, a').filter({
      hasText: /get started|upload|try free/i
    }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should display pricing information', async ({ page }) => {
    await page.goto('/');

    // Scroll to pricing section
    await page.locator('text=/pricing|plans/i').first().scrollIntoViewIfNeeded();

    // Should show pricing plans
    await expect(page.locator('text=/basic|pro|premium/i').first()).toBeVisible();
  });

  test('should navigate to auth page when clicking sign in', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.locator('a, button').filter({
      hasText: /sign in|login/i
    }).first();

    if (await signInButton.isVisible()) {
      await signInButton.click();
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

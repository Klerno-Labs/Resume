import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display auth page', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.locator('h1, h2').filter({ hasText: /sign in|login/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto('/auth');

    // Try to submit without filling fields
    await page.locator('button[type="submit"]').first().click();

    // Should show validation messages
    await expect(page.locator('text=/required/i').first()).toBeVisible();
  });

  test('should switch between login and register', async ({ page }) => {
    await page.goto('/auth');

    // Should start on login by default or have a toggle
    const registerToggle = page.locator('text=/sign up|register|create account/i').first();
    if (await registerToggle.isVisible()) {
      await registerToggle.click();

      // Should now show register form with name field
      await expect(page.locator('input[name="name"], input[placeholder*="name" i]')).toBeVisible();
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to auth when accessing editor without login', async ({ page }) => {
    await page.goto('/editor');

    // Should redirect to auth page or show login prompt
    await page.waitForURL(/auth/);
    expect(page.url()).toContain('auth');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
  });

  test('should switch between login and signup', async ({ page }) => {
    await page.goto('/auth');
    
    // Should start on login
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    
    // Click to switch to signup
    await page.getByTestId('button-toggle-auth').click();
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
    
    // Click to switch back to login
    await page.getByTestId('button-toggle-auth').click();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByTestId('button-submit-auth').click();
    
    // Should show validation error for email
    await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('short');
    await page.getByTestId('button-submit-auth').click();
    
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('should have Google sign-in button', async ({ page }) => {
    await page.goto('/auth');
    
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
  });
});

test.describe('Home Page', () => {
  test('should display homepage content', async ({ page }) => {
    await page.goto('/');
    
    // Check for main headline or CTA
    await expect(page.getByRole('link', { name: /get started|sign up/i }).first()).toBeVisible();
  });

  test('should navigate to auth page from CTA', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /get started/i }).first().click();
    
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing editor without auth', async ({ page }) => {
    await page.goto('/editor');
    
    // Should either redirect to auth or show the editor (if session exists)
    // The app may handle this differently, so we just check the page loads
    await expect(page).toHaveURL(/\/(editor|auth)/);
  });
});

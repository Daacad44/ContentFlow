/**
 * E2E: Login flow (email/password)
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
  });

  test('shows validation on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/email/i).first()).toBeVisible();
  });

  test('surfaces OAuth error from query string', async ({ page }) => {
    await page.goto('/login?error=oauth_failed');
    await expect(page.getByText(/google sign-in/i).first()).toBeVisible({ timeout: 5000 });
  });
});

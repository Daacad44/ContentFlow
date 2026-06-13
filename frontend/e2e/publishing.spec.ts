/**
 * E2E: Publishing pipeline UI (requires test credentials + Zernio in CI secrets)
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_CREDENTIALS = Boolean(TEST_EMAIL && TEST_PASSWORD);

test.describe('Publishing flow', () => {
  test.skip(!HAS_CREDENTIALS, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for full flow');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByLabel('Password').fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|workspaces|complete-profile)/, { timeout: 15_000 });
  });

  test('navigate to posts and open composer', async ({ page }) => {
    await page.goto('/posts/new');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('scheduler page loads', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.locator('body')).toContainText(/schedule|calendar|post/i);
  });

  test('publishing logs page loads', async ({ page }) => {
    await page.goto('/publishing');
    await expect(page.locator('body')).toContainText(/publish|queue|job/i);
  });
});

test.describe('Google OAuth', () => {
  test('Google button links to backend OAuth endpoint', async ({ page }) => {
    await page.goto('/login');
    const googleLink = page.getByRole('link', { name: 'Continue with Google' });
    await expect(googleLink).toHaveAttribute('href', /\/auth\/google\?redirect=/);
  });
});

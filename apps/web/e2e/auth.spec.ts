import { expect, test } from '@playwright/test';

const testEmail = () => `e2e-${Date.now()}@kalehub.test`;

test.describe('Authentication', () => {
  test('unauthenticated root redirects to /sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('sign-in button redirects to Keycloak', async ({ page }) => {
    await page.goto('/sign-in');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/realms\/kalehub/, { timeout: 10_000 });
  });

  test('registers a new account via Keycloak form and lands on the chat page', async ({ page }) => {
    const email = testEmail();
    const password = 'Password1!';

    await page.goto('/sign-in');
    await page.click('button[type="submit"]');
    await page.waitForURL(/realms\/kalehub/, { timeout: 15_000 });

    await page.locator('a[href*="registration"]').click({ timeout: 15_000 });
    await page.waitForURL(/registration/, { timeout: 10_000 });

    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="password-confirm"]', password);
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.locator('h1', { hasText: 'Kalehub' })).toBeVisible();
  });
});

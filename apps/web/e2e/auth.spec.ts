import { test, expect } from '@playwright/test'

// Generates a unique email per test run to avoid Keycloak duplicate-user errors.
const testEmail = () => `e2e-${Date.now()}@kalehub.test`

test.describe('Authentication', () => {
  test('unauthenticated root redirects to /sign-in', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-in button redirects to Keycloak', async ({ page }) => {
    await page.goto('/sign-in')
    await page.click('button[type="submit"]')
    // Keycloak login page contains the realm name in the URL
    await expect(page).toHaveURL(/realms\/kalehub/, { timeout: 10_000 })
  })

  test('registers a new account and lands on the chat page', async ({ page }) => {
    const email = testEmail()
    const password = 'Password1!'

    await page.goto('/sign-in')
    await page.click('button[type="submit"]')
    await page.waitForURL(/realms\/kalehub/)

    // Switch to the Keycloak registration form
    await page.click('a[href*="register"]')
    await page.waitForURL(/registration/)

    await page.fill('input[name="firstName"]', 'E2E')
    await page.fill('input[name="lastName"]', 'User')
    await page.fill('input[name="email"], input[name="username"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="password-confirm"]', password)
    await page.click('input[type="submit"], button[type="submit"]')

    // After registration, Keycloak redirects back through Auth.js to the app root
    await expect(page).toHaveURL('/', { timeout: 15_000 })
    // The chat layout's sidebar should be visible
    await expect(page.locator('h1', { hasText: 'Kalehub' })).toBeVisible()
  })
})

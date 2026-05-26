import { type BrowserContext, expect, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

async function registerAndSignIn(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`${baseURL}/sign-in`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/realms\/kalehub/, { timeout: 15_000 });

  await page.locator('a[href*="registration"]').click({ timeout: 15_000 });
  await page.waitForURL(/registration/, { timeout: 10_000 });

  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="password-confirm"]', password);
  await page.getByRole('button', { name: /register/i }).click();

  await page.waitForURL(`${baseURL}/`, { timeout: 20_000 });
  await page.close();
}

async function getSessionInfo(
  context: BrowserContext,
): Promise<{ accessToken: string; userId: string }> {
  const page = await context.newPage();
  const sessionRes = await page.request.get(`${baseURL}/api/auth/session`);
  const session = (await sessionRes.json()) as { accessToken?: string; userId?: string };
  await page.close();
  if (!session.accessToken || !session.userId) throw new Error('Missing session fields');
  return { accessToken: session.accessToken, userId: session.userId };
}

async function createConversation(
  context: BrowserContext,
  accessToken: string,
  participantId: string,
): Promise<string> {
  const page = await context.newPage();
  const res = await page.request.post(`${apiURL}/conversations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { participantId },
  });
  await page.close();
  if (!res.ok()) throw new Error(`POST /conversations failed: ${res.status()}`);
  const body = (await res.json()) as { id: string };
  return body.id;
}

test.describe('Real-time messaging', () => {
  test('User A sends a message; User B receives it without page refresh', async ({ browser }) => {
    const ts = Date.now();
    const emailA = `e2e-a-${ts}@kalehub.test`;
    const emailB = `e2e-b-${ts}@kalehub.test`;
    const password = 'Password1!';

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    try {
      await registerAndSignIn(ctxA, emailA, password);
      await registerAndSignIn(ctxB, emailB, password);

      const { accessToken: tokenA } = await getSessionInfo(ctxA);
      const { userId: userBId } = await getSessionInfo(ctxB);

      const conversationId = await createConversation(ctxA, tokenA, userBId);

      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      await pageA.goto(`${baseURL}/dm/${conversationId}`);
      await pageB.goto(`${baseURL}/dm/${conversationId}`);

      await expect(pageA.locator('input[placeholder="Message…"]')).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('input[placeholder="Message…"]')).toBeVisible({ timeout: 10_000 });

      const message = `Hello from A at ${ts}`;
      await pageA.fill('input[placeholder="Message…"]', message);
      await pageA.click('button:has-text("Send")');

      // User B receives the message in real time via Socket.io
      await expect(pageB.locator(`text=${message}`)).toBeVisible({ timeout: 10_000 });
      // User A sees their own sent message too
      await expect(pageA.locator(`text=${message}`)).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

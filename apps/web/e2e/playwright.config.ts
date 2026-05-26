import { defineConfig, devices } from '@playwright/test';

// When running inside the E2E Docker container (network_mode: host on Linux),
// localhost:3000 reaches the web service via the host's port mapping.
// PLAYWRIGHT_BASE_URL can be overridden for other network topologies.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

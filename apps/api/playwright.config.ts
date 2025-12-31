import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8787',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8787/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});

import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || (isCI ? 'http://localhost:3001' : 'http://localhost:3000'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: isCI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // CI: backend serves built frontend on 3001 (npm run build runs first)
  // Local: start dev servers manually (npm run dev + npm run dev:server)
  webServer: isCI
    ? {
        command: 'node server/index.js',
        port: 3001,
        reuseExistingServer: true,
        timeout: 30000,
      }
    : undefined,
});

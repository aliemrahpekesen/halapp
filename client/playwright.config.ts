import { defineConfig } from '@playwright/test';

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: CHROMIUM },
  },
  webServer: [
    {
      command: 'NODE_ENV=test PORT=3001 npm run start:e2e',
      cwd: '../server',
      port: 3001,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run preview',
      port: 4173,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

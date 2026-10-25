import { defineConfig, devices } from '@playwright/test';

// Lokal kann ein vorinstalliertes Chromium über CHROMIUM_PATH genutzt werden; in CI installiert Playwright selbst.
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4173',
    hasTouch: true,
    screenshot: 'on',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone-quer', use: { ...devices['Desktop Chrome'], viewport: { width: 844, height: 390 }, hasTouch: true } },
    { name: 'iphone-hoch', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'tablet-quer', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, hasTouch: true } },
  ],
});

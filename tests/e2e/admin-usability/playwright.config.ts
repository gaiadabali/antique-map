/**
 * The 10.4 proxy run of the owner's timed admin recipes, against staging (no webServer). From the repo root:
 *   bash tests/e2e/admin-usability/run.sh npx playwright test -c tests/e2e/admin-usability/playwright.config.ts
 * `desktop` (1280x800) runs every recipe; `mobile` (390x844) runs the store user's order steps only
 * (specs tagged by the file name `04-`). One worker, files in order: later recipes read what earlier ones created.
 */
import { defineConfig, devices } from '@playwright/test'

const launchOptions = process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {}

export default defineConfig({
  testDir: '.',
  testMatch: /\d\d-.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  outputDir: process.env.USABILITY_TMP ?? 'test-results/admin-usability',
  use: { screenshot: 'only-on-failure', actionTimeout: 20_000 },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
    {
      name: 'mobile',
      testMatch: /04-.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        launchOptions,
      },
    },
  ],
})

/**
 * The timed test at a person's pace (`./pace.ts`), against staging (no webServer). From the repo root:
 *   bash tests/e2e/admin-usability/human/run.sh
 * `office` (1280x800) runs the office tasks; `mobile` (390x844, touch) runs the store user's T5 and T8. One
 * worker, files in order: T2 marks T1's antique sold, T12 replaces T8's delivered order.
 */
import { defineConfig, devices } from '@playwright/test'

const launchOptions = process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {}

export default defineConfig({
  testDir: '.',
  testMatch: /t\d\d-.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 1_800_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  outputDir: process.env.USABILITY_TMP ?? 'test-results/admin-usability-human',
  use: { screenshot: 'only-on-failure', actionTimeout: 30_000 },
  projects: [
    {
      name: 'office',
      testIgnore: /t0[58]-.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
    {
      name: 'mobile',
      testMatch: /t0[58]-.*\.spec\.ts$/,
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

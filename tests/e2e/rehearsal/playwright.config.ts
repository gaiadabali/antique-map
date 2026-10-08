/**
 * The 10.3.b launch rehearsal, run against staging (no webServer). From the repo root:
 *   npx playwright test -c tests/e2e/rehearsal/playwright.config.ts --workers=1
 * Projects: `mobile` 390x844 and `desktop` 1280x800. The chat spec spends real chat sessions
 * (6 per IP per hour), so it runs on `mobile` only. Origins default to staging (`support.ts`).
 */
import { defineConfig, devices } from '@playwright/test'

import { GALLERY, SHOP } from './support'

const launchOptions = process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {}

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        launchOptions,
      },
    },
    {
      name: 'desktop',
      testIgnore: /chat\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
  metadata: { gallery: GALLERY, shop: SHOP },
})

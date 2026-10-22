/**
 * The 10.6.f content gate, run against staging (no webServer). Run from the repo root:
 *   npx playwright test -c tests/e2e/review/playwright.config.ts --workers=1
 * Origins default to staging; `E2E_BASE_GALLERY` / `E2E_BASE_SHOP` override (as support/env.ts of the
 * gallery specs). Projects: `data` = HTTP-only scans (`*.data.spec.ts`), `mobile` 390x844 and
 * `desktop` 1280x800 = browser specs (`*.ui.spec.ts`).
 */
import { defineConfig, devices } from '@playwright/test'

import { GALLERY, SHOP } from './support'

const launchOptions = process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {}
const mobile = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  launchOptions,
}
const desktop = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 800 },
  launchOptions,
}

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  projects: [
    { name: 'data', testMatch: /\.data\.spec\.ts$/, use: { baseURL: GALLERY, launchOptions } },
    { name: 'mobile', testMatch: /\.ui\.spec\.ts$/, use: { ...mobile, baseURL: GALLERY } },
    { name: 'desktop', testMatch: /\.ui\.spec\.ts$/, use: { ...desktop, baseURL: GALLERY } },
  ],
  metadata: { gallery: GALLERY, shop: SHOP },
})

/**
 * The shop fulfilment gate (TASKS.md 7.4.a), on the shop host — the admin's too (ADMIN_HOST unset,
 * Q1), so one project drives both the buyer-facing pages and `/admin/orders` in the same test. Run
 * against a server started by `node tests/e2e/admin/local.mjs start` (or the orchestrator's own
 * staging build) on `E2E_PORT`/`E2E_BASE_URL`, the same shape `tests/e2e/admin`'s config uses.
 */
import { defineConfig, devices } from '@playwright/test'

import { SITES } from '../../../engine/packages/config/src/sites/table'
import { PORT, SHOP_ORIGIN } from './env'

const shop = process.env.E2E_SHOP_HOST ?? SITES.shop.hostnames.local[0]

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  projects: [
    {
      name: 'shop-fulfilment',
      metadata: { port: PORT, shop },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        baseURL: SHOP_ORIGIN,
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        screenshot: 'only-on-failure',
      },
    },
  ],
})

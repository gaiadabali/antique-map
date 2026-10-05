/**
 * The admin roles drive (TASKS.md 3.6.d, phase 3's admin **Done when**): one project, the shop's
 * host — the admin's (Q1) — at 1280 px, serially, since the cases share one database and the
 * owner's flow adds records the counts read. Run with `pnpm exec playwright test -c
 * tests/e2e/admin` against a server started by `node tests/e2e/admin/local.mjs start` (or CI's
 * start-server.sh) on `E2E_PORT`; the root config's projects do not cover this folder.
 */
import { defineConfig, devices } from '@playwright/test'

import { SITES } from '../../../engine/packages/config/src/sites/table'
import { localPort } from './local.mjs'

const PORT: string = localPort()
const shop = process.env.E2E_SHOP_HOST ?? SITES.shop.hostnames.local[0]
const gallery = process.env.E2E_GALLERY_HOST ?? SITES.gallery.hostnames.local[0]

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // A loaded machine's Postgres can refuse a connection in time, which the admin shows as a
  // server error: a case that hits it is tried again rather than reported as the admin's fault.
  retries: 2,
  timeout: 120_000,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  projects: [
    {
      name: 'admin',
      metadata: { port: PORT, shop, gallery },
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: `http://${shop}:${PORT}`,
        actionTimeout: 15_000,
        screenshot: 'only-on-failure',
        navigationTimeout: 30_000,
      },
    },
  ],
})

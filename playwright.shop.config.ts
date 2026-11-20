/**
 * The shop app's own e2e (TASKS.md 23.6.a; PLAN-V2 phase C): `engine/apps/shop` on ONE host,
 * `shop.localhost:<E2E_PORT>`, its routes with no `/shop/<locale>` prefix, on a production build
 * started with `SITE_HOSTS=shop.localhost` and its own database (`indies_shop_<suffix>`, cms-shop's
 * migration, the staff accounts of `tests/e2e/admin/accounts.ts` made in it). Today's app keeps its
 * own config (`playwright.config.ts`); nothing here runs against it, except that "See the original"
 * asks the gallery's public read API, which today's app serves on the gallery host.
 *
 *   pnpm test:e2e:shop                       the purchase, tracking, the admin roles, partner sign-in
 *   E2E_GALLERY=up   pnpm test:e2e:shop originals   the gallery answering: the link shows
 *   E2E_GALLERY=down pnpm test:e2e:shop originals   the gallery stopped: no link, the page is fine
 *
 * The originals spec reads `E2E_GALLERY` and skips without it: whether the gallery is up is the
 * run's set-up, not the spec's. The shop keeps a gallery answer for hours and no answer for a
 * minute (`engine/apps/shop/src/originals/cached.ts`), so each state runs on a freshly started
 * shop server.
 *
 * One worker, in order: the specs share the staff accounts, the owner's settings (the distance
 * bands) and the order counts the store check reads; sign-in is limited per address, so the global
 * setup signs each account in once (`tests/e2e/support/sessions.ts`) — with E2E_FIXTURES=none, as
 * the accounts live in the shop's own database, not today's CMS. `E2E_EVIDENCE=1` writes the gate's
 * screenshots and `drive.json` to `docs/gates/v2-shop/` (`docs/gates/v2-shop.md`).
 */
import { defineConfig, devices } from '@playwright/test'

import { localPort } from './tests/e2e/admin/local.mjs'

process.env.E2E_FIXTURES = 'none'

const PORT = localPort()
const SHOP_HOST = process.env.E2E_SHOP_HOST ?? 'shop.localhost'

export default defineConfig({
  testDir: './tests/e2e/shop-app',
  globalSetup: './tests/e2e/support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // A production build on a loaded laptop: the admin renders after the server answers, and the
  // purchase walks a dozen pages.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  projects: [
    {
      name: 'shop-app',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: `http://${SHOP_HOST}:${PORT}`,
      },
    },
  ],
})

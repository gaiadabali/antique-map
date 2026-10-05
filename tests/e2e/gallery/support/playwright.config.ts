/**
 * The gallery browse/search e2e's own Playwright config (TASKS.md 5.1.d). The root
 * `playwright.config.ts` declares a project per host for its own suites and does **not** cover
 * `tests/e2e/gallery/`, so running the spec through the root config lists no tests ("No tests
 * found"). This file gives the gallery suite exactly one project on the gallery host — the same
 * shape the `shop-e2e` project uses for the shop — without touching the root config, which the
 * ticket's owned paths exclude.
 *
 * Run it with an explicit `--config` (this file's own folder is `support/`, so `testDir` is `..`):
 *
 *   E2E_PORT=$PORT pnpm exec playwright test \
 *     --config tests/e2e/gallery/support/playwright.config.ts \
 *     tests/e2e/gallery/browse.spec.ts --reporter=list
 *
 * The orchestrator may fold this project into the root config instead; until then this is the way
 * the gallery specs run.
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.E2E_PORT ?? '4200'

export default defineConfig({
  testDir: '..',
  // One worker: every spec makes its own fixtures in `beforeAll`, so parallel workers would make
  // and drop overlapping records on one shared database.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://gallery.localhost:${PORT}`,
  },
})

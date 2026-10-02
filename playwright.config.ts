/**
 * Playwright projects for the one app (TASKS.md 2.1.b), every spec under the one e2e folder,
 * `tests/e2e/`: both sites' hostnames — `gallery.localhost` and `shop.localhost` — on ONE server
 * and one port, each at a phone's 390 px and a desktop's 1280 px (DESIGN-SYSTEM.md §3, §10).
 *
 * - smoke (`tests/e2e/smoke/`): {gallery, shop} × {mobile, desktop};
 * - status (`tests/e2e/status/`): every case on the gallery host, the `@any-app` cases on the shop
 *   host — the spike's fixture item route is gone (TASKS.md 1.4.c), so nothing needs a second
 *   server;
 * - a11y (`tests/e2e/a11y/`): one project per host, each case setting both widths itself.
 *
 * Until the host picks the site (TASKS.md 2.2), the one process serves one brand — `BRAND`,
 * `indies-gallery` in CI — on every hostname, so the shop host still renders the gallery's brand
 * and both hosts' projects read that brand's committed config (`E2E_BRAND`). 2.2 gives each host
 * its own site and its own facts.
 *
 * No `webServer`: the server is a production build from the release's own tree, started by
 * `.github/scripts/start-server.sh` (e2e.yml's "Start the server" step). Locally, start it the
 * same way (or `node .next/standalone/engine/apps/web/server.js` on your own port) and set
 * `E2E_PORT`. Chromium resolves every `*.localhost` name to loopback by itself; Node's resolver —
 * which the `request` fixture uses — may not, so CI maps both names in `/etc/hosts`, and a
 * workstation without that mapping runs only the browser-driven cases.
 *
 * Accessibility: `@axe-core/playwright` is a devDependency; each e2e spec calls `new
 * AxeBuilder({ page }).analyze()` against the page under test — this config only wires up the
 * browser matrix, not the assertion. Lighthouse (`lighthouserc.web.json`) is the tool that
 * throttles for the *performance* budgets; this is only the layout viewport.
 */
import { defineConfig, devices, type Project } from '@playwright/test'

const desktop: Project['use'] = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 800 },
}
const mobile: Project['use'] = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
}

/** What the smoke and a11y specs read about the brand the server runs (`tests/e2e/smoke/`). */
export type SmokeMetadata = {
  /** The brand folder (BRAND's folder at the repository root). */
  readonly brandRoot: string
  /** Its config under `site/`. */
  readonly configFile: string
  /** The site this project's hostname names (`gallery` | `shop`). */
  readonly site: Site
}

type Site = 'gallery' | 'shop'

/** The one server's port: CI's 4200 unless `E2E_PORT` names this worktree's own. */
const PORT = process.env.E2E_PORT ?? '4200'
/** The brand the one process serves until 2.2 picks the site from the host. */
const BRAND = process.env.E2E_BRAND ?? 'indies-gallery'

const SITES: readonly { site: Site; host: string }[] = [
  { site: 'gallery', host: process.env.E2E_GALLERY_HOST ?? 'gallery.localhost' },
  { site: 'shop', host: process.env.E2E_SHOP_HOST ?? 'shop.localhost' },
]

const baseURLOf = (host: string) => `http://${host}:${PORT}`
const metadataOf = (site: Site): SmokeMetadata => ({
  brandRoot: BRAND,
  configFile: 'brand.config.json',
  site,
})

const smoke: Project[] = SITES.flatMap(({ site, host }) => {
  const common = { testDir: './tests/e2e/smoke', metadata: metadataOf(site) }
  const baseURL = baseURLOf(host)
  return [
    { name: `${site}-mobile`, ...common, use: { ...mobile, baseURL } },
    { name: `${site}-desktop`, ...common, use: { ...desktop, baseURL } },
  ]
})

const STATUS = { testDir: './tests/e2e/status', testMatch: 'status.spec.ts' }
const status: Project[] = SITES.map(({ site, host }) => ({
  name: `status-${site}`,
  ...STATUS,
  ...(site === 'gallery' ? {} : { grep: /@any-app/ }),
  use: { ...desktop, baseURL: baseURLOf(host) },
}))

// axe on every shell page of each host, each width set by the spec itself (TASKS.md 5.6.e).
const a11y: Project[] = SITES.map(({ site, host }) => ({
  name: `${site}-a11y`,
  testDir: './tests/e2e/a11y',
  metadata: metadataOf(site),
  use: { ...desktop, baseURL: baseURLOf(host) },
}))

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  projects: [...smoke, ...status, ...a11y],
})

/**
 * Playwright projects for the one app (TASKS.md 2.1.b, 2.2), every spec under the one e2e folder,
 * `tests/e2e/`: both sites' hostnames — `gallery.localhost` and `shop.localhost` — on ONE server
 * and one port, each host serving its own site (the proxy picks it from `Host`, ARCHITECTURE.md
 * §2), at a phone's 390 px and a desktop's 1280 px (DESIGN-SYSTEM.md §3, §10).
 *
 * - smoke (`tests/e2e/smoke/`): {gallery, shop} × {mobile, desktop};
 * - status (`tests/e2e/status/`): one project per host — every case holds on both;
 * - a11y (`tests/e2e/a11y/`): one project per host, each case setting both widths itself;
 * - hosts (`tests/e2e/hosts/`): host trust — an unknown host, a spoofed `X-Forwarded-Host`, the
 *   admin's one host — run once, since each case names its own hosts;
 * - shop (`tests/e2e/shop/`): the shop host alone, one project, each case setting its own widths —
 *   the same single-project-per-host shape as a11y (TASKS.md 7.3.a);
 * - gallery (`tests/e2e/gallery/`): the gallery host alone, the same shape (TASKS.md 5.1.d, 5.4.c, 5.5).
 *
 * What a host's site is — its key, name, locales and whether it is the admin host — comes from the
 * committed `SITES` (`metadataOf`), never from the specs. The admin host is the shop's, as the
 * server runs with ADMIN_HOST unset (Q1).
 *
 * No `webServer`: the server is a production build from the release's own tree, started by
 * `.github/scripts/start-server.sh` (e2e.yml's "Start the server" step) with GALLERY_HOSTS and
 * SHOP_HOSTS set to the two names. Locally, start it the same way (or `node
 * .next/standalone/engine/apps/web/server.js` on your own port with those variables) and set
 * `E2E_PORT`. Chromium resolves every `*.localhost` name to loopback by itself; Node's resolver —
 * which the `request` fixture uses — may not, so CI maps both names in `/etc/hosts`.
 *
 * Accessibility: `@axe-core/playwright` is a devDependency; each e2e spec calls `new
 * AxeBuilder({ page }).analyze()` against the page under test — this config only wires up the
 * browser matrix, not the assertion. Lighthouse (`lighthouserc.web.json`) is the tool that
 * throttles for the *performance* budgets; this is only the layout viewport.
 */
import { defineConfig, devices, type Project } from '@playwright/test'

import { localPort } from './tests/e2e/admin/local.mjs'
import { SITES, type SiteKey } from './engine/packages/config/src/sites/table'

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

/** What the smoke, status and a11y specs read about the site a project's host serves. */
export type SmokeMetadata = {
  /** The site this project's hostname names. */
  readonly site: SiteKey
  /** Its name, as its pages show it (`SITES.<site>.name`). */
  readonly name: string
  /** Its locales, the default unprefixed. */
  readonly locales: { readonly default: string; readonly supported: readonly string[] }
  /** Whether this host answers `/admin` and Payload's REST (ADMIN_HOST: the shop's, Q1). */
  readonly admin: boolean
  /** The other site's host, for the cases that ask one host for another's paths. */
  readonly otherHost: string
}

/** The one server's port: CI's 4200 unless `E2E_PORT` names this worktree's own. */
const PORT = process.env.E2E_PORT ?? '4200'

const HOSTS: readonly { site: SiteKey; host: string }[] = [
  { site: 'gallery', host: process.env.E2E_GALLERY_HOST ?? SITES.gallery.hostnames.local[0] },
  { site: 'shop', host: process.env.E2E_SHOP_HOST ?? SITES.shop.hostnames.local[0] },
]
const ADMIN_SITE: SiteKey = 'shop'

const baseURLOf = (host: string) => `http://${host}:${PORT}`
const metadataOf = (site: SiteKey): SmokeMetadata => ({
  site,
  name: SITES[site].name,
  locales: SITES[site].locales,
  admin: site === ADMIN_SITE,
  otherHost: HOSTS.find((each) => each.site !== site)?.host ?? '',
})

const smoke: Project[] = HOSTS.flatMap(({ site, host }) => {
  const common = { testDir: './tests/e2e/smoke', metadata: metadataOf(site) }
  const baseURL = baseURLOf(host)
  return [
    { name: `${site}-mobile`, ...common, use: { ...mobile, baseURL } },
    { name: `${site}-desktop`, ...common, use: { ...desktop, baseURL } },
  ]
})

const status: Project[] = HOSTS.map(({ site, host }) => ({
  name: `status-${site}`,
  testDir: './tests/e2e/status',
  metadata: metadataOf(site),
  use: { ...desktop, baseURL: baseURLOf(host) },
}))

// axe on every shell page of each host, each width set by the spec itself (TASKS.md 5.6.e).
const a11y: Project[] = HOSTS.map(({ site, host }) => ({
  name: `${site}-a11y`,
  testDir: './tests/e2e/a11y',
  metadata: metadataOf(site),
  use: { ...desktop, baseURL: baseURLOf(host) },
}))

// The shop's flows (product, bag, checkout, pay) on the shop host; each spec sets its own widths (6.1.c, 6.5).
const shopHost = HOSTS.find((each) => each.site === 'shop')?.host ?? ''
const shopE2e: Project = {
  name: 'shop-e2e',
  testDir: './tests/e2e/shop',
  metadata: metadataOf('shop'),
  use: { ...desktop, baseURL: baseURLOf(shopHost) },
}

// The gallery's flows (browse, item, makers/places/pages, contact, the gate) on the gallery host;
// each spec sets its own widths (5.1.d, 5.4.c, 5.5).
const galleryHost = HOSTS.find((each) => each.site === 'gallery')?.host ?? ''
// Specs that need what CI's server lacks: the media pipeline (object storage, the derivatives
// worker and its IIIF tiles: a lead image decodes only once derivatives exist, and the item
// fixtures wait up to 180 s for them) and, for the journey and Done-when walks, the real mail and
// bot-check round trips on top. They run where that stack is — staging, with `E2E_BASE_GALLERY` and
// `E2E_BASE_SHOP` set (see done-when.spec.ts's header) — and their zoom, tile and no-price claims
// are also held by `tests/e2e/review/` (zoom.ui, no-price.data) and `tests/e2e/rehearsal/`.
const GALLERY_STAGING_ONLY = [
  '**/done-when.spec.ts',
  '**/dpr3-navigation.spec.ts',
  '**/item.spec.ts',
  '**/journey.spec.ts',
]
const galleryE2e: Project = {
  name: 'gallery-e2e',
  testDir: './tests/e2e/gallery',
  testIgnore: process.env.E2E_BASE_GALLERY ? undefined : GALLERY_STAGING_ONLY,
  metadata: metadataOf('gallery'),
  use: { ...desktop, baseURL: baseURLOf(galleryHost) },
}

// Host trust: each case names its own hosts, on the one port.
const hosts: Project = {
  name: 'hosts',
  testDir: './tests/e2e/hosts',
  metadata: { port: PORT, gallery: HOSTS[0]?.host, shop: HOSTS[1]?.host },
  use: { ...desktop },
}

// The admin role drive (TASKS.md 3.6.d, `docs/gates/3.6.md`): the shop host, the admin's
// (Q1), on this worktree's own port and database (`pnpm worktree:env`, `local.mjs`'s
// `localPort()`) — CI sets E2E_PORT the same way `start-server.sh` runs the server.
// The three admin files share one database and one set of staff accounts: roles.spec switches the
// owner's profile language and counts orders, owner-flow adds records and signs in as the owner in
// English, store-panel moves and reassigns orders. Run side by side in separate workers (this
// config is `fullyParallel`), they flip each other's language and change the counts the other
// reads, so each file is its own project and each waits for the one before it (the folder's own
// config, `tests/e2e/admin/playwright.config.ts`, gets the same by `workers: 1`).
const adminProject = (name: string, testMatch: string, dependencies?: string[]): Project => ({
  name,
  testDir: './tests/e2e/admin',
  testMatch,
  dependencies,
  // As the folder's own config: the admin renders after the server answers, slower than 30 s / 5 s
  // on a loaded machine (a role's case signs in, switches language twice and reads SQL counts).
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // `port` and `gallery`: roles.spec's "/admin is a 404 on the gallery's host" names the other host.
  metadata: { ...metadataOf(ADMIN_SITE), port: localPort(), gallery: galleryHost },
  use: {
    ...desktop,
    baseURL: `http://${SITES[ADMIN_SITE].hostnames.local[0]}:${localPort()}`,
  },
})
const admin: Project[] = [
  adminProject('admin', '**/roles.spec.ts'),
  adminProject('admin-owner-flow', '**/owner-flow.spec.ts', ['admin']),
  adminProject('admin-store-panel', '**/store-panel.spec.ts', ['admin-owner-flow']),
]

export default defineConfig({
  // Signs the staff accounts in once; sign-in is limited per address (tests/e2e/support/sessions.ts).
  globalSetup: './tests/e2e/support/global-setup.ts',
  fullyParallel: true,
  // CI sets E2E_WORKERS to the runner's cores (e2e.yml); Playwright's default is half of them.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  projects: [...smoke, ...status, ...a11y, shopE2e, galleryE2e, hosts, ...admin],
})

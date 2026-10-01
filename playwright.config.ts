/**
 * Playwright projects (TASKS.md 2.2.e, 4.4.b, 5.4.e), every spec under the one e2e folder,
 * `tests/e2e/` (PARALLEL-TRACKS.md §1): the smoke (`tests/e2e/smoke/`) on `{ig, oei,
 * test-gallery, test-emporium} × {desktop, mobile}`, and the status spec (`tests/e2e/status/`) on
 * a gallery with the spike's fixture routes on and — its `@any-app` cases — on an emporium. `ig`/`oei` are the two real brands, each on its own storefront app;
 * `test-gallery`/`test-emporium` are the synthetic `test` brand run on both apps (CONVENTIONS.md
 * §1) — every module on, so anything shaped like one real brand fails here first.
 *
 * No `webServer`: the servers are production builds from the release's own tree, started by
 * `.github/scripts/start-server.sh` (e2e.yml's "Start the servers" step), and each `baseURL` is an
 * `E2E_*_URL` pointing at one. Locally, start them the same way (or `next start` on your own
 * port) and set the variables; unset, each project asks its CI port.
 *
 * Each smoke project names its brand folder and config file in `metadata`, so the smoke reads
 * the brand's name, locales and assets from the committed config instead of repeating them.
 *
 * Accessibility: `@axe-core/playwright` is a devDependency; each e2e spec calls `new
 * AxeBuilder({ page }).analyze()` against the page under test — this config only wires up the
 * browser matrix, not the assertion.
 *
 * The mobile viewport mirrors DESIGN-SYSTEM.md §7's reference device (a Samsung Galaxy A15 / Redmi
 * Note-class Android): 393×851 @ 2.75 DPR, real touch, matching Chrome for Android's UA family
 * closely enough for CI — Lighthouse (`lighthouserc*.json`) is the tool that throttles for the
 * *performance* budgets; this is only the layout viewport.
 */
import { defineConfig, devices, type Project } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 393, height: 851 }

const desktop: Project['use'] = { ...devices['Desktop Chrome'] }
const mobile: Project['use'] = {
  ...devices['Desktop Chrome'],
  viewport: MOBILE_VIEWPORT,
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
}

/** What the smoke reads about the brand a project's server runs (`tests/e2e/smoke/smoke.spec.ts`). */
export type SmokeMetadata = {
  /** The brand folder (BRAND_ROOT's content), from the repository root. */
  readonly brandRoot: string
  /** Its config under `site/`: `brand.config.json`, or `brand.<storefront>.json` for `test`. */
  readonly configFile: string
}

const SITES = [
  {
    name: 'ig',
    urlEnv: 'E2E_GALLERY_URL',
    port: 4200,
    brand: { brandRoot: 'indies-gallery', configFile: 'brand.config.json' },
  },
  {
    name: 'oei',
    urlEnv: 'E2E_EMPORIUM_URL',
    port: 4201,
    brand: { brandRoot: 'old-east-indies', configFile: 'brand.config.json' },
  },
  {
    name: 'test-gallery',
    urlEnv: 'E2E_TEST_GALLERY_URL',
    port: 4202,
    brand: { brandRoot: 'test', configFile: 'brand.gallery.json' },
  },
  {
    name: 'test-emporium',
    urlEnv: 'E2E_TEST_EMPORIUM_URL',
    port: 4203,
    brand: { brandRoot: 'test', configFile: 'brand.emporium.json' },
  },
] as const satisfies readonly {
  name: string
  urlEnv: string
  port: number
  brand: SmokeMetadata
}[]

const urlOf = (env: string, port: number) => process.env[env] ?? `http://localhost:${port}`

const smoke: Project[] = SITES.flatMap(({ name, urlEnv, port, brand }) => {
  const baseURL = urlOf(urlEnv, port)
  const common = { testDir: './tests/e2e/smoke', metadata: brand }
  return [
    { name: `${name}-desktop`, ...common, use: { ...desktop, baseURL } },
    { name: `${name}-mobile`, ...common, use: { ...mobile, baseURL } },
  ]
})

/**
 * 4.1's status codes and headers (the spec's header): every case on a gallery started with
 * SPIKE_ROUTES=1, and the cases no app may answer differently (`@any-app`) on the test brand's
 * emporium, the smoke's own server.
 */
const STATUS = { testDir: './tests/e2e/status', testMatch: 'status.spec.ts' }
const status: Project[] = [
  { name: 'status-gallery', ...STATUS, use: { ...desktop, baseURL: urlOf('E2E_SPIKE_URL', 4204) } },
  {
    name: 'status-emporium',
    ...STATUS,
    grep: /@any-app/,
    use: { ...desktop, baseURL: urlOf('E2E_TEST_EMPORIUM_URL', 4203) },
  },
]

// axe on every shell page of every brand, each width set by the spec itself (TASKS.md 5.6.e).
const a11y: Project[] = SITES.map(({ name, urlEnv, port, brand }) => ({
  name: `${name}-a11y`,
  testDir: './tests/e2e/a11y',
  metadata: brand,
  use: { ...desktop, baseURL: urlOf(urlEnv, port) },
}))

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  projects: [...smoke, ...status, ...a11y],
})

/**
 * TASKS.md 2.2.e — Playwright projects `{ig, oei, test-gallery, test-emporium}
 * × {desktop, mobile}`. `ig`/`oei` are the two real brands, each on its own
 * storefront app; `test-gallery`/`test-emporium` are the synthetic `test`
 * brand run on both apps (CONVENTIONS.md §1) — every module on, so anything
 * shaped like one real brand fails here first.
 *
 * Accessibility: `@axe-core/playwright` is a devDependency; each e2e spec
 * calls `new AxeBuilder({ page }).analyze()` against the page under test —
 * this config only wires up the browser matrix, not the assertion.
 *
 * The mobile viewport mirrors DESIGN-SYSTEM.md §7's reference device (a
 * Samsung Galaxy A15 / Redmi Note-class Android): 393×851 @ 2.75 DPR, real
 * touch, matching Chrome for Android's UA family closely enough for CI —
 * Lighthouse (2.2.e's other half, `lighthouserc*.json`) is the tool that
 * throttles for the *performance* budgets; this is only the layout viewport.
 *
 * No app exists yet (phase 4, App shells, has not landed) — `webServer` is
 * therefore commented out for now and every `baseURL` is a `E2E_*_URL` env
 * var CI's e2e job (2.3.a) sets once it builds both apps; running
 * `pnpm test:e2e` today fails to connect, which is the expected state before
 * phase 4, not a broken config.
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

const SITES = [
  { name: 'ig', urlEnv: 'E2E_GALLERY_URL', defaultPort: 4200 },
  { name: 'oei', urlEnv: 'E2E_EMPORIUM_URL', defaultPort: 4201 },
  { name: 'test-gallery', urlEnv: 'E2E_TEST_GALLERY_URL', defaultPort: 4202 },
  { name: 'test-emporium', urlEnv: 'E2E_TEST_EMPORIUM_URL', defaultPort: 4203 },
] as const

const projects: Project[] = SITES.flatMap(({ name, urlEnv, defaultPort }) => {
  const baseURL = process.env[urlEnv] ?? `http://localhost:${defaultPort}`
  return [
    { name: `${name}-desktop`, use: { ...desktop, baseURL } },
    { name: `${name}-mobile`, use: { ...mobile, baseURL } },
  ]
})

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  projects,
})

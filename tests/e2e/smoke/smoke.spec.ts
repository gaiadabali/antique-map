/**
 * The smoke per host (TASKS.md 4.4.b, 2.2), on the release's own tree started as a host runs it
 * (`.github/scripts/start-server.sh`): the host's own site — its home in English and Indonesian
 * with its name, its own line and its own files — `/admin/login` on the admin host alone, and
 * `/api/health`. What the site is comes from the project's `metadata` (`SITES`,
 * playwright.config.ts), never from this file.
 */
import { expect, test, type TestInfo } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'

const siteOf = (testInfo: TestInfo) => testInfo.project.metadata as SmokeMetadata

/** The default locale is unprefixed (ARCHITECTURE.md §11); every other one is `/<locale>`. */
const homeOf = (site: SmokeMetadata, locale: string) =>
  locale === site.locales.default ? '/' : `/${locale}`

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

for (const locale of ['en', 'id']) {
  test(`the home page in ${locale} answers 200 with this host's own site`, async ({
    page,
  }, testInfo) => {
    const site = siteOf(testInfo)
    expect(site.locales.supported, `the site serves ${locale}`).toContain(locale)
    const response = await page.goto(homeOf(site, locale))
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.locator('html')).toHaveAttribute('data-site', site.site)
    await expect(page).toHaveTitle(new RegExp(escape(site.name)))
    await expect(page.locator('header')).toContainText(site.name)
    await expect(page.locator('h1')).toHaveText(site.name)
    await expect(page.locator('.site-lede')).not.toBeEmpty()
  })
}

test('each site’s home says its own line, in each language', async ({ page }, testInfo) => {
  const site = siteOf(testInfo)
  const ledes: string[] = []
  for (const locale of site.locales.supported) {
    await page.goto(homeOf(site, locale))
    ledes.push((await page.locator('.site-lede').textContent()) ?? '')
  }
  expect(new Set(ledes).size, 'one line per language').toBe(site.locales.supported.length)
  // The other site's home, asked for by its own host, says something else.
  await page.goto(`http://${site.otherHost}:${new URL(page.url()).port}/`)
  expect(await page.locator('.site-lede').textContent()).not.toBe(ledes[0])
})

test('the home links its canonical and alternates on the site’s own origin', async ({
  page,
}, testInfo) => {
  const site = siteOf(testInfo)
  // The server's allow-list names this host, on this port: its origin is the site's canonical one.
  const { origin } = new URL(testInfo.project.use.baseURL ?? '')
  await page.goto('/id')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/id`)
  // The English home is the origin itself; Next writes it without the trailing `/`.
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', origin)
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', site.name)
})

test('the site’s own files are served, at its root URLs too', async ({ request }, testInfo) => {
  const { site } = siteOf(testInfo)
  for (const [path, type] of [
    [`/${site}/logo.svg`, 'image/svg+xml'],
    [`/${site}/og.png`, 'image/png'],
    ['/favicon.ico', 'image/'],
    ['/apple-touch-icon.png', 'image/png'],
    ['/site.webmanifest', 'manifest'],
  ] as const) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    expect(response.headers()['content-type'] ?? '', path).toContain(type)
  }
  // The other site's files are not this host's: an internal path, so not found.
  const other = site === 'gallery' ? 'shop' : 'gallery'
  expect((await request.get(`/${other}/logo.svg`)).status()).toBe(404)
})

test('/admin/login answers 200 on the admin host, and 404 on the other', async ({
  request,
}, testInfo) => {
  const response = await request.get('/admin/login', { maxRedirects: 0 })
  expect(response.status()).toBe(siteOf(testInfo).admin ? 200 : 404)
  expect(response.headers()['content-type']).toContain('text/html')
})

test('/api/health answers 200 with app, database, storage and the environment', async ({
  request,
}) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toBe('no-store')
  const body = await response.json()
  // `degraded` is still a 200: the queue is reported, never gating (TASKS.md 4.6.a).
  expect(['ok', 'degraded']).toContain(body.status)
  expect(body.environment).toBe('local')
  for (const check of ['app', 'boot', 'database', 'storage']) {
    expect(body.checks[check].ok, check).toBe(true)
  }
})

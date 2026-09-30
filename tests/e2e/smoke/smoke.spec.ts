/**
 * The first smoke per server (TASKS.md 4.4.b), on the release's own tree started as a host runs it
 * (`.github/scripts/start-server.sh`): the home page in English and Indonesian with the brand's
 * name, `/admin/login`, and `/brand-assets/` — each file's type and caching (C13
 * `BRAND_ASSET_URL`). What the brand is — its name, locales and asset files — comes from its
 * committed config (the project's `metadata`, playwright.config.ts), never from this file.
 *
 * Brand assets follow the brand folder, not a switch: a file the folder ships must be linked at
 * its versioned URL and served `immutable` with its type; a file it does not ship yet (no brand
 * commits `site/assets/` before TASKS.md 4.5) must be linked bare and answer an uncached 404. So
 * the day 4.5 merges, the same cases start asserting the served files, with nothing to turn on.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { expect, test, type APIRequestContext, type TestInfo } from '@playwright/test'

import type { SmokeMetadata } from '../../playwright.config'

type BrandFacts = {
  readonly name: string
  readonly locales: { readonly default: string; readonly supported: readonly string[] }
  readonly assets: { readonly logo: string; readonly favicon: string }
}

/** C1 `BRAND_ASSET_TYPES`, restated: the smoke checks the route against the contract, not itself. */
const TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}
const IMMUTABLE = 'public, max-age=31536000, immutable'
const SHORT = 'public, max-age=300'

function brandOf(testInfo: TestInfo): { config: BrandFacts; assetsDir: string } {
  const { brandRoot, configFile } = testInfo.project.metadata as SmokeMetadata
  const site = join(dirname(testInfo.config.configFile!), brandRoot, 'site')
  const config = JSON.parse(readFileSync(join(site, configFile), 'utf8')) as BrandFacts
  return { config, assetsDir: join(site, 'assets') }
}

/** The default locale is unprefixed (ARCHITECTURE.md §11); every other one is `/<locale>`. */
const homeOf = (config: BrandFacts, locale: string) =>
  locale === config.locales.default ? '/' : `/${locale}`

/** The page title holds the brand's name (its metadata's `title.default`, or a page's template). */
const titleWith = (name: string) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

for (const locale of ['en', 'id']) {
  test(`the home page in ${locale} answers 200 with the brand's name`, async ({
    page,
  }, testInfo) => {
    const { config } = brandOf(testInfo)
    expect(config.locales.supported, `the brand serves ${locale}`).toContain(locale)
    const response = await page.goto(homeOf(config, locale))
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page).toHaveTitle(titleWith(config.name))
    await expect(page.locator('header')).toContainText(config.name)
    await expect(page.locator('h1')).toBeVisible()
  })
}

test('/admin/login answers 200', async ({ request }) => {
  const response = await request.get('/admin/login', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/html')
})

/** Every `/brand-assets/…` URL a page links, as its HTML spells it. */
async function linkedAssets(request: APIRequestContext, path: string): Promise<URL[]> {
  const html = await (await request.get(path)).text()
  const found = [...html.matchAll(/(?:src|href)="(\/brand-assets\/[^"]+)"/g)]
  return [...new Set(found.map((match) => match[1]!.replaceAll('&amp;', '&')))].map(
    (href) => new URL(href, 'http://brand.invalid'),
  )
}

const assetPathOf = (url: URL) =>
  url.pathname.slice('/brand-assets/'.length).split('/').map(decodeURIComponent)

test('the brand files the home page links are served with their type and caching', async ({
  request,
}, testInfo) => {
  const { config, assetsDir } = brandOf(testInfo)
  const urls = await linkedAssets(request, homeOf(config, config.locales.default))
  const linked = urls.map((url) => assetPathOf(url).join('/'))
  // The shell links its logo and favicon through the route, shipped or not.
  expect(linked).toContain(config.assets.logo)
  expect(linked).toContain(config.assets.favicon)

  for (const url of urls) {
    const segments = assetPathOf(url)
    const extension = /\.[^./]+$/.exec(url.pathname)?.[0].toLowerCase() ?? ''
    const shipped = existsSync(join(assetsDir, ...segments))
    const version = url.searchParams.get('v')
    const at = `${url.pathname}${url.search}`
    if (!shipped) {
      expect(version, `${at}: a file the brand does not ship is linked bare`).toBeNull()
      const missing = await request.get(at)
      expect(missing.status(), at).toBe(404)
      expect(missing.headers()['cache-control'], at).toBe('no-store')
      continue
    }
    expect(version, `${at}: a shipped file is linked at its version`).toMatch(/^[0-9a-f]{8}$/)
    const served = await request.get(at)
    expect(served.status(), at).toBe(200)
    const headers = served.headers()
    expect(headers['content-type'], at).toBe(TYPES[extension])
    expect(headers['x-content-type-options'], at).toBe('nosniff')
    expect(headers['cache-control'], at).toBe(IMMUTABLE)
    if (extension === '.svg') expect(headers['content-security-policy'], at).toContain("'none'")
    const etag = headers['etag']
    expect(etag, at).toMatch(/^"[0-9a-f]{64}"$/)

    const stale = await request.get(`${url.pathname}?v=00000000`)
    expect(stale.status(), `${url.pathname}, a stale version`).toBe(200)
    expect(stale.headers()['cache-control']).toBe(SHORT)
    const revalidated = await request.get(url.pathname, { headers: { 'if-none-match': etag! } })
    expect(revalidated.status(), `${url.pathname}, If-None-Match`).toBe(304)
  }
})

test('/brand-assets/ serves nothing outside the brand’s assets or of another type', async ({
  request,
}) => {
  for (const path of [
    '/brand-assets/..%2Fbrand.config.json',
    '/brand-assets/%2e%2e/brand.config.json',
    '/brand-assets/notes.txt',
  ]) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
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

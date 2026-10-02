/**
 * Each host's status codes, asked for as a browser asks (4.1 review, senior-fe #2, #9; TASKS.md
 * 2.2.e), on a production build.
 *
 * A 404 is a 404 only because every page renders in full per request (`htmlLimitedBots: /.*\/`
 * with `instant = false` on each site's root layout, ARCHITECTURE.md §6) — Next's bypass of the
 * prerendered shell under Cache Components, which a minor release could change. Nothing else in CI
 * requests a page for its status; this spec does, on both hosts: a page's own `notFound()` (a CMS
 * page slug with no page), the proxy's not-found rewrite and its status (a path that names no
 * page, an internal path asked for directly), Next's own 308 before the proxy, and the client
 * hints the admin alone gets. The item route's stale-slug 308 (`permanentRedirect()`) returns
 * with the item page (phase 5); its rule is `src/item/canonical.ts`, unit-tested.
 *
 * Two Playwright projects run it (playwright.config.ts), `status-gallery` and `status-shop`, one
 * per host: every case holds on both, and where the admin host differs the project's metadata
 * says which it is.
 *
 * `E2E_EXPECT_UA_FIX=1` since the proxy sets a missing User-Agent (5.3);
 * `E2E_EXPECT_NOT_FOUND_BODY=1` once the not-found page renders the designed surface (22.4.e);
 * `E2E_EXPECT_CSP=1` once the proxy sets the nonce CSP (41.1.a). Unset, their cases are `fixme`.
 */
import { request as httpRequest } from 'node:http'

import { expect, test, type APIRequestContext, type TestInfo } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'

/** A browser's user agent: the full request-time render is what Next gives every agent here. */
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'

/**
 * Paths no site has a page for: `/nope` is a CMS page's address (one segment), whose 404 is the
 * page's `notFound()`; `/nope/deeper` names no page at all, so it is the proxy's not-found rewrite,
 * answered 404 by its status; `/en/not-found` is the not-found route asked for by name; `/de/…` a
 * locale prefix no site serves; `/en` the default locale's prefix, which is never an address; and
 * `/gallery/en`, `/shop/en/…` each site's internal tree asked for directly, on either host.
 */
const NOT_FOUND = [
  '/nope',
  '/nope/deeper',
  '/en/not-found',
  '/de/product/1726-bali',
  '/en',
  '/gallery/en',
  '/shop/en/browse',
]
const NO_PAGE = ['/nope', '/nope/deeper']

const siteOf = (testInfo: TestInfo) => testInfo.project.metadata as SmokeMetadata
const ask = (request: APIRequestContext, path: string, headers: Record<string, string> = {}) =>
  request.get(path, { maxRedirects: 0, headers: { 'user-agent': BROWSER_UA, ...headers } })
/** A request whose User-Agent is empty: Next counts it as no bot, so the proxy must set one. */
const askWithEmptyAgent = (request: APIRequestContext, path: string) =>
  request.get(path, { maxRedirects: 0, headers: { 'user-agent': '' } })
/**
 * A request with no User-Agent header at all (qa's 5.4 gate, L6). Playwright's request context
 * always sends one, so this is Node's own `http`, which adds none and follows no redirect.
 */
const askWithNoAgent = (baseURL: string | undefined, path: string) =>
  new Promise<{ status: number; location?: string }>((resolve, reject) => {
    const sent = httpRequest(new URL(path, baseURL), { method: 'GET' }, (response) => {
      response.resume()
      resolve({ status: response.statusCode ?? 0, location: response.headers.location })
    })
    sent.on('error', reject)
    sent.end()
  })
const expectUaFix = () =>
  test.fixme(process.env.E2E_EXPECT_UA_FIX !== '1', 'the proxy does not set a missing User-Agent')

test.describe('status codes on each host', () => {
  test('/ answers 200: the host’s own home', async ({ request }) => {
    expect((await ask(request, '/')).status()).toBe(200)
    expect((await ask(request, '/id')).status()).toBe(200)
  })

  for (const path of NOT_FOUND) {
    test(`${path} answers 404`, async ({ request }) => {
      expect((await ask(request, path)).status()).toBe(404)
    })

    test(`${path} answers 404 with the designed page in its <main>`, async ({ request }) => {
      test.fixme(
        process.env.E2E_EXPECT_NOT_FOUND_BODY !== '1',
        'the not-found page renders its designed surface from 22.4.e',
      )
      const response = await ask(request, path)
      expect(response.status()).toBe(404)
      const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(await response.text())?.[1] ?? ''
      expect(main.replace(/<[^>]*>/g, '').trim(), 'the text of the 404’s <main>').not.toBe('')
    })
  }

  for (const path of NO_PAGE) {
    test(`${path} with no User-Agent header still answers 404 (the proxy sets one)`, async ({
      baseURL,
    }) => {
      expectUaFix()
      expect((await askWithNoAgent(baseURL, path)).status).toBe(404)
    })

    test(`${path} with an empty User-Agent still answers 404`, async ({ request }) => {
      expectUaFix()
      expect((await askWithEmptyAgent(request, path)).status()).toBe(404)
    })
  }

  for (const path of ['/nope/', '/nope//deeper', '/id/']) {
    test(`${path} is Next's own 308, before the proxy`, async ({ request }) => {
      const response = await ask(request, path)
      expect(response.status()).toBe(308)
      expect(response.headers()['x-middleware-rewrite']).toBeUndefined()
    })
  }

  test('/admin answers on the admin host alone', async ({ request }, testInfo) => {
    const { admin } = siteOf(testInfo)
    expect((await ask(request, '/admin/login')).status()).toBe(admin ? 200 : 404)
    expect((await ask(request, '/api/users/me')).status()).toBe(admin ? 200 : 404)
  })
})

test.describe('headers on each host', () => {
  test('robots fails closed until SEO builds it', async ({ request }) => {
    const response = await ask(request, '/robots.txt')
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
  })

  test('the admin’s client hints stay on the admin (one document request per first visit)', async ({
    request,
  }, testInfo) => {
    expect((await ask(request, '/')).headers()['critical-ch']).toBeUndefined()
    expect((await ask(request, '/id')).headers()['critical-ch']).toBeUndefined()
    // The admin host's admin gets them; elsewhere `/admin` is a 404 (next.config.ts's header rule
    // is by path, so the 404 carries them too, harmlessly: no page under it is a storefront's).
    if (siteOf(testInfo).admin) {
      expect((await ask(request, '/admin/login')).headers()['critical-ch']).toBe(
        'Sec-CH-Prefers-Color-Scheme',
      )
    }
  })
})

test.describe('the nonce CSP (41.1.a)', () => {
  test('every script carries the request’s nonce, and nothing is blocked', async ({ page }) => {
    test.fixme(process.env.E2E_EXPECT_CSP !== '1', 'the proxy sets no CSP until 41.1.a')
    const violations: string[] = []
    page.on('console', (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text()))
        violations.push(message.text())
    })
    const response = await page.goto('/', { waitUntil: 'load' })
    const policy = response?.headers()['content-security-policy'] ?? ''
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1]
    expect(nonce, 'a nonce in the answer’s CSP').toBeTruthy()
    const html = (await response?.text()) ?? ''
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0])
    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) expect(script).toContain(`nonce="${nonce}"`)
    expect(violations).toEqual([])
  })
})

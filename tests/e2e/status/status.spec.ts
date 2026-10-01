/**
 * The storefront's status codes and CSP, asked for as a browser asks (4.1 review, senior-fe #2, #9).
 *
 * A 404 is a 404 and a stale item slug one permanent redirect only because every page renders in
 * full per request (`htmlLimitedBots: /.*\/` with `instant = false`, ARCHITECTURE.md §9) — Next's
 * bypass of the prerendered shell, which a minor release could change. Nothing else in CI requests
 * a page for its status; this spec does, on a production build. It outlives the spike: the item
 * addresses it asks for are the fixture route's until phase 33 gives them real items.
 *
 * Two Playwright projects run it (playwright.config.ts). `status-gallery`, on a gallery production
 * build with `SPIKE_ROUTES=1` (the fixture item route — allowed only where the boot check judges
 * the host local), runs every case. `status-emporium`, on an emporium production build, runs the
 * cases tagged `@any-app` — a path that names no page, a not-found route, an unsupported locale
 * prefix, robots and the admin-only client hints — which no app may answer differently.
 *
 * `E2E_EXPECT_UA_FIX=1` since the proxy sets a missing User-Agent (C13 `PROXY_USER_AGENT`, 5.3);
 * `E2E_EXPECT_NOT_FOUND_BODY=1` once the not-found page renders the designed surface (22.4.e);
 * `E2E_EXPECT_CSP=1` once the proxy sets the nonce CSP (41.1.a). Unset, their cases are `fixme`.
 */
import { request as httpRequest } from 'node:http'

import { expect, test, type APIRequestContext } from '@playwright/test'

/** A browser's user agent: the full request-time render is what Next gives every agent here. */
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
const CAFE = '/product/1706-caf%C3%A9-de-java' // a slug outside ASCII: encoded once in its URL
const BALI = '/product/1726-bali'
const STALE_BALI = '/product/1726-old-bali'
const ANY_APP = { tag: '@any-app' }

/**
 * Paths no app has a page for: `/nope` is a CMS page's address (C10, one segment), whose 404 is
 * the page's `notFound()`; `/nope/deeper` names no page at all, so it is the proxy's not-found
 * rewrite, answered 404 by its status (5.3's Found #1); `/en/not-found` is the not-found route
 * asked for by name; `/de/…` a locale prefix no brand supports.
 */
const NOT_FOUND = ['/nope', '/nope/deeper', '/en/not-found', '/de/product/1726-bali']
const NO_PAGE = ['/nope', '/nope/deeper']

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

test.describe('status codes, on any app', ANY_APP, () => {
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
    test(`${path} with no User-Agent header still answers 404 (the proxy sets one — C13, 5.3)`, async ({
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
})

test.describe('status codes, on the spike gallery', () => {
  test('/en/item/1726-bali answers 404', async ({ request }) => {
    expect((await ask(request, '/en/item/1726-bali')).status()).toBe(404)
  })

  test('the canonical item address answers 200', async ({ request }) => {
    expect((await ask(request, CAFE)).status()).toBe(200)
    expect((await ask(request, BALI)).status()).toBe(200)
  })

  for (const [asked, canonical] of [
    ['/product/1706-caf%C3%A9-java', CAFE], // an old encoded slug
    ['/product/1706-van-t%27hoff', CAFE], // an old link's odd slug
    ['/product/1706', CAFE],
    ['/product/1726-b%61li', BALI], // never a second 200 for `bali`
  ] as const) {
    test(`${asked} is one permanent redirect, encoded once, to a 200`, async ({ request }) => {
      const response = await ask(request, asked)
      expect(response.status()).toBe(308)
      expect(response.headers()['location']).toBe(canonical)
      expect((await ask(request, canonical)).status()).toBe(200)
    })
  }

  test("a stale slug's permanent redirect keeps its query (5.3.e)", async ({ request }) => {
    const response = await ask(request, `${STALE_BALI}?utm_source=mail`)
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(`${BALI}?utm_source=mail`)
  })

  test('a stale slug with no User-Agent header is still a permanent redirect (C13, 5.3)', async ({
    baseURL,
  }) => {
    expectUaFix()
    expect(await askWithNoAgent(baseURL, STALE_BALI)).toEqual({ status: 308, location: BALI })
  })

  test('a stale slug with an empty User-Agent is still a permanent redirect', async ({
    request,
  }) => {
    expectUaFix()
    const response = await askWithEmptyAgent(request, STALE_BALI)
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(BALI)
  })

  for (const path of [`${BALI}/`, '/product//1726-bali']) {
    test(`${path} is Next's own 308, before the proxy`, async ({ request }) => {
      const response = await ask(request, path)
      expect(response.status()).toBe(308)
      expect(response.headers()['x-middleware-rewrite']).toBeUndefined()
    })
  }
})

test.describe('headers, on any app', ANY_APP, () => {
  test('robots fails closed until SEO builds it', async ({ request }) => {
    const response = await ask(request, '/robots.txt')
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
  })

  test('the admin’s client hints stay on the admin (one document request per first visit)', async ({
    request,
  }) => {
    expect((await ask(request, '/')).headers()['critical-ch']).toBeUndefined()
    expect((await ask(request, '/admin/login')).headers()['critical-ch']).toBe(
      'Sec-CH-Prefers-Color-Scheme',
    )
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
    const response = await page.goto(CAFE, { waitUntil: 'load' })
    const policy = response?.headers()['content-security-policy'] ?? ''
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1]
    expect(nonce, 'a nonce in the answer’s CSP').toBeTruthy()
    const html = (await response?.text()) ?? ''
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0])
    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) expect(script).toContain(`nonce="${nonce}"`)
    await expect(page.locator('[data-js]')).toHaveAttribute('data-js', 'on') // it hydrated
    expect(violations).toEqual([])
  })
})

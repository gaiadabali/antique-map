/**
 * The storefront's status codes and CSP, asked for as a browser asks (4.1 review, senior-fe #2, #9).
 *
 * A 404 is a 404 and a stale item slug one permanent redirect only because every page renders in
 * full per request (`htmlLimitedBots: /.*\/` with `instant = false`, ARCHITECTURE.md §9) — Next's
 * bypass of the prerendered shell, which a minor release could change. Nothing else in CI requests
 * a page for its status; this spec does, on a production build. It outlives the spike: the item
 * addresses it asks for are the fixture route's until phase 33 gives them real items.
 *
 * Needs: a production build of this app on `baseURL` (the Playwright project's, e.g.
 * `E2E_GALLERY_URL`), serving any gallery brand with `SPIKE_ROUTES=1` (the fixture item route —
 * allowed only where the boot check judges the host local). `E2E_EXPECT_CSP=1` once the proxy sets
 * the nonce CSP (41.1.a); `E2E_EXPECT_UA_FIX=1` once the proxy sets a missing User-Agent (C13).
 */
import { expect, test, type APIRequestContext } from '@playwright/test'

/** A browser's user agent: the full request-time render is what Next gives every agent here. */
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
const CAFE = '/product/1706-caf%C3%A9-de-java' // a slug outside ASCII: encoded once in its URL
const BALI = '/product/1726-bali'

const ask = (request: APIRequestContext, path: string, headers: Record<string, string> = {}) =>
  request.get(path, { maxRedirects: 0, headers: { 'user-agent': BROWSER_UA, ...headers } })

test.describe('status codes', () => {
  for (const path of ['/nope', '/en/not-found', '/de/product/1726-bali', '/en/item/1726-bali']) {
    test(`${path} answers 404`, async ({ request }) => {
      expect((await ask(request, path)).status()).toBe(404)
    })
  }

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

  for (const path of [`${BALI}/`, '/product//1726-bali']) {
    test(`${path} is Next's own 308, before the proxy`, async ({ request }) => {
      const response = await ask(request, path)
      expect(response.status()).toBe(308)
      expect(response.headers()['x-middleware-rewrite']).toBeUndefined()
    })
  }

  test('a request with no User-Agent still answers 404 (the proxy sets one — C13, 4.3)', async ({
    request,
  }) => {
    test.fixme(
      process.env.E2E_EXPECT_UA_FIX !== '1',
      'the proxy does not set a missing User-Agent yet',
    )
    const response = await request.get('/nope', { maxRedirects: 0, headers: { 'user-agent': '' } })
    expect(response.status()).toBe(404)
  })
})

test.describe('headers', () => {
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

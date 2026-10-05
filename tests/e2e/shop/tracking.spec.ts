/**
 * The tracking page and "find my order" (TASKS.md 7.3.a, 7.3.c), on the shop host, a production
 * build.
 *
 * What this file proves: a wrong token answers the same 404 a missing one would, `noindex`, the
 * find-my-order index never reveals whether an order exists, axe clean at both widths, and the
 * tenth tracking guess in a minute passes while the eleventh is a 429 with `Retry-After` — the
 * proxy's own answer (`engine/packages/http/src/proxy/decide.ts`,
 * `./tracking-rate-limit.ts`'s 10/minute), raw `node:http` requests like `tests/e2e/hosts` so a
 * distinct `X-Forwarded-For` keeps this budget apart from the page-driven cases above, which carry
 * none and so share the `unknown` bucket (well under its own budget). What this file cannot prove
 * (reported, not fixed here): the page shows the driver image only once a real order reaches
 * `on_the_way`, and each status change sends exactly one email — both need a real order, which only
 * a full checkout makes; that is phase 7.4's gate, not this file's.
 */
import { request as httpRequest } from 'node:http'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type TestInfo } from '@playwright/test'

type Answer = { readonly status: number; readonly headers: Record<string, string | undefined> }

/**
 * `GET path` on this project's own host and port, with exactly these headers (no redirects) —
 * `127.0.0.1` on the wire, the project's `*.localhost` host only in the `Host` header
 * (`tests/e2e/hosts`'s own `ask()`): Node's resolver, unlike Chromium's, does not always answer
 * `*.localhost` with loopback.
 */
function ask(
  testInfo: TestInfo,
  path: string,
  headers: Record<string, string> = {},
): Promise<Answer> {
  const base = new URL(testInfo.project.use.baseURL as string)
  return new Promise((resolve, reject) => {
    const sent = httpRequest(
      {
        host: '127.0.0.1',
        port: Number(base.port),
        path,
        headers: { host: base.host, 'user-agent': 'e2e-tracking', ...headers },
      },
      (response) => {
        response.resume()
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers as Record<string, string | undefined>,
          }),
        )
      },
    )
    sent.on('error', reject)
    sent.end()
  })
}

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function axeClean(page: import('@playwright/test').Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

test.describe('the token page', () => {
  test('a wrong token is a 404', async ({ page }) => {
    const wrong = await page.goto('/track/this-token-does-not-exist-at-all')
    expect(wrong?.status()).toBe(404)
  })

  test('is noindex', async ({ page }) => {
    await page.goto('/track/this-token-does-not-exist-at-all')
    // Next's own notFound() escape hatch adds its own robots meta alongside the page's static one
    // (both say noindex): every meta robots tag on the page must say so, not just the first.
    const tags = await page.locator('meta[name="robots"]').all()
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) await expect(tag).toHaveAttribute('content', /noindex/)
  })
})

test.describe('find my order', () => {
  for (const viewport of WIDTHS) {
    test(`is axe clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const response = await page.goto('/track')
      expect(response?.status()).toBe(200)
      await axeClean(page, `/track at ${viewport.width} px`)
    })
  }

  test('never reveals whether an order exists', async ({ page }) => {
    await page.goto('/track')
    await page.getByLabel(/order number/i).fill('999999999')
    await page.getByLabel(/email or whatsapp/i).fill('nobody@example.test')
    await page.getByRole('button', { name: /send me the link/i }).click()
    await expect(page.getByRole('status')).toContainText(/if those details match/i)
  })
})

test.describe('the tenth tracking guess in a minute is throttled (TASKS.md 7.3.c)', () => {
  test('the tenth request passes, the eleventh is a 429 with Retry-After', async () => {
    const testInfo = test.info()
    const headers = { 'x-forwarded-for': '203.0.113.77' }
    for (let i = 0; i < 10; i++) {
      const answer = await ask(testInfo, `/track/e2e-guess-${i}`, headers)
      expect(answer.status, `guess ${i + 1}`).toBe(404)
    }
    const eleventh = await ask(testInfo, '/track/e2e-guess-10', headers)
    expect(eleventh.status).toBe(429)
    expect(Number(eleventh.headers['retry-after'])).toBeGreaterThan(0)
  })
})

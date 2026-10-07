/**
 * The gallery item page and deep zoom (TASKS.md 5.2.e Check), on a production build at 390 px:
 *
 * 1. Opening an available work's page, the viewer zooms: before the Zoom button is clicked no
 *    request reaches `iiif/`; the click brings an `info.json` and at least one tile, both 200;
 *    zooming further with the keyboard brings at least one more tile; no console error mentions
 *    WebGL, a texture or CORS.
 * 2. `uploads/` — the private original — is 403 anonymously, from Payload's file route and (when
 *    `MEDIA_PUBLIC_URL` is known) the bucket itself.
 * 3. A sold work shows "Sold", never "Ask about this", never "Price on request" — only "Ask for
 *    another example" (the owner's decision of 2026-10-06), a `wa.me` link whose decoded text
 *    says the work has sold. Checked in English and Indonesian.
 * 4. Neither work's asking price appears anywhere: not the HTML, not an `RSC: 1` flight fetch, not
 *    any JSON response captured while the page loads.
 *
 * Fixtures (`support/item-fixtures.ts`) make their own place, grade, one large recto (a hand-built
 * PNG — no `sharp` outside the workspace packages that depend on it, see that file's header) and
 * two published works sharing it, removed in `afterAll` through `support/fixtures.ts`'s `Ledger`.
 * The gallery's test WhatsApp number is set for the run and restored after, the `contact.spec.ts`
 * pattern, so the handoff links are real `wa.me` addresses to decode.
 */
import {
  expect,
  request as newRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import { createHref } from '../../../engine/packages/config/src/sites/routes/href'
import { SITES } from '../../../engine/packages/config/src/sites/table'
import { BASE_URL, GALLERY_ORIGIN, HOST_HEADER, OWNER } from './support/env'
import { newLedger, type Ledger } from './support/fixtures'
import { createItemFixtures, mediaPublicUrl, type ItemFixtures } from './support/item-fixtures'

const href = createHref(SITES.gallery)
const SHOTS = 'docs/reports/workers/5.2e'
const TEST_WHATSAPP = '+6590000001'
/** A price figure as the page could print it: plain, or grouped by `,` `.` or a space. */
const figure = (n: number) =>
  new RegExp(`(?<!\\d)${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[,. \\u00a0]?')}(?!\\d)`)

/** The seed makes no user (`support/env.ts`): log in, or bootstrap the owner with
 * `first-register` when the database has none yet (the `hosts/admin-origin.spec.ts` pattern). */
async function signIn(request: APIRequestContext): Promise<string> {
  const post = (path: string, data: Record<string, unknown>) =>
    request.post(`${BASE_URL}${path}`, { headers: HOST_HEADER, data })
  const tokenOf = async (res: { ok(): boolean; json(): Promise<unknown> }) =>
    res.ok() ? (((await res.json()) as { token?: string }).token ?? null) : null

  let token = await tokenOf(
    await post('/api/users/login', { email: OWNER.email, password: OWNER.password }),
  )
  if (token) return token
  token = await tokenOf(
    await post('/api/users/first-register', {
      ...OWNER,
      confirmPassword: OWNER.password,
      name: 'E2E Owner',
    }),
  )
  if (token) return token
  const again = await post('/api/users/login', { email: OWNER.email, password: OWNER.password })
  token = await tokenOf(again)
  if (token) return token
  throw new Error(`could not sign the owner in: login ${again.status()}`)
}

/** How long a just-created work may take to stop showing a reused `publicId`'s earlier, deleted
 * occupant: Cache Components serves the stale render once (stale-while-revalidate) before the
 * next request regenerates it — the `browse.spec.ts`/`contact.spec.ts` sold-status pattern. */
const FRESH = 30_000

/** Opens `path`, retrying until the render names `mustContain` (never a stale, deleted work's). */
async function openFresh(page: Page, path: string, mustContain: string) {
  await expect(async () => {
    const res = await page.goto(`${GALLERY_ORIGIN}${path}`, { waitUntil: 'load' })
    expect(res?.status(), path).toBe(200)
    expect(await page.content()).toContain(mustContain)
  }, `${path} reflects the fixture just made (a stale cached render fails here)`).toPass({
    timeout: FRESH,
  })
}

test.describe.configure({ mode: 'default' })

test.describe('Gallery item page and deep zoom (5.2.e)', () => {
  test.setTimeout(240_000)

  let api: APIRequestContext
  let ledger: Ledger
  let token: string
  let fx: ItemFixtures
  let settingsBefore: Record<string, unknown> | null = null

  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

  test.beforeAll(async () => {
    test.setTimeout(240_000)
    api = await newRequest.newContext({ baseURL: BASE_URL })
    token = await signIn(api)
    ledger = newLedger(api)

    const before = await api.get(`${BASE_URL}/api/globals/site-settings`, { headers: auth() })
    expect(before.ok()).toBeTruthy()
    settingsBefore = (await before.json()) as Record<string, unknown>
    const gallery = (settingsBefore.gallery ?? {}) as Record<string, unknown>
    const contact = (gallery.contact ?? {}) as Record<string, unknown>
    const patched = await api.post(`${BASE_URL}/api/globals/site-settings`, {
      headers: auth(),
      data: { gallery: { ...gallery, contact: { ...contact, whatsapp: TEST_WHATSAPP } } },
    })
    expect(patched.ok(), `set the test WhatsApp number: ${patched.status()}`).toBeTruthy()

    fx = await createItemFixtures(api, ledger, token)
  })

  test.afterAll(async () => {
    test.setTimeout(180_000)
    try {
      if (settingsBefore !== null) {
        await api.post(`${BASE_URL}/api/globals/site-settings`, {
          headers: auth(),
          data: { gallery: settingsBefore.gallery },
        })
      }
    } finally {
      await ledger?.cleanup()
      await api?.dispose()
    }
  })

  test('the viewer zooms and tiles load from iiif/, with no WebGL/texture/CORS error', async ({
    page,
  }) => {
    const itemPath = href(
      'item',
      { publicId: fx.available.publicId, slug: fx.available.slug },
      'en',
    )
    const requests: string[] = []
    const responses: { url: string; status: number }[] = []
    const consoleErrors: string[] = []
    page.on('request', (r) => {
      if (/\/iiif\//.test(r.url())) requests.push(r.url())
    })
    page.on('response', (r) => {
      if (/\/iiif\//.test(r.url())) responses.push({ url: r.url(), status: r.status() })
    })
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await openFresh(page, itemPath, fx.stockAvailable)
    expect(requests, 'no iiif/ request before the viewer opens').toEqual([])
    await shoot(page, '5.2e-item-before-zoom')

    await page.getByRole('button', { name: 'Zoom into the image' }).click()
    await expect
      .poll(() => responses.some((r) => /\/info\.json$/.test(r.url) && r.status === 200), {
        timeout: 30_000,
      })
      .toBe(true)
    const tiles = () => responses.filter((r) => r.url.endsWith('.jpg') && r.status === 200).length
    await expect.poll(tiles, { timeout: 30_000 }).toBeGreaterThanOrEqual(1)
    await shoot(page, '5.2e-item-after-zoom')

    const beforeKeyZoom = tiles()
    const viewport = page.getByRole('group', { name: fx.recto.alt })
    await viewport.click()
    await page.keyboard.press('+')
    await expect.poll(tiles, { timeout: 30_000 }).toBeGreaterThan(beforeKeyZoom)

    expect(
      consoleErrors.filter((text) => /webgl|texture|cors/i.test(text)),
      consoleErrors.join('\n'),
    ).toEqual([])
  })

  test('uploads/ is 403 anonymously', async () => {
    const anon = await newRequest.newContext({ baseURL: BASE_URL })
    try {
      const fileRoute = await anon.get(`${BASE_URL}/api/media/file/${fx.upload.filename}`, {
        headers: HOST_HEADER,
      })
      expect(fileRoute.status(), 'Payload file route, anonymous').toBe(403)

      const base = mediaPublicUrl()
      if (base !== null) {
        const bucket = await anon.get(`${base}/${fx.upload.prefix}/${fx.upload.filename}`)
        expect(bucket.status(), 'the bucket key itself, anonymous').toBe(403)
      }
    } finally {
      await anon.dispose()
    }
  })

  for (const locale of ['en', 'id'] as const) {
    test(`a sold work says ${locale === 'en' ? 'Sold' : 'Terjual'}, never "Ask about this"`, async ({
      page,
    }) => {
      const sold = locale === 'en' ? 'Sold' : 'Terjual'
      const askAnother = locale === 'en' ? 'Ask for another example' : 'Tanya contoh lain'
      const priceOnRequest = locale === 'en' ? 'Price on request' : 'Harga atas permintaan'
      const itemPath = href('item', { publicId: fx.sold.publicId, slug: fx.sold.slug }, locale)

      await page.setViewportSize({ width: 390, height: 844 })
      await openFresh(page, itemPath, fx.stockSold)

      const panel = page.locator('aside[data-status="sold"]')
      await expect(panel.getByText(sold, { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Ask about this' })).toHaveCount(0)
      await expect(panel).not.toContainText(priceOnRequest)

      const link = panel.getByRole('link', { name: askAnother })
      await expect(link).toBeVisible()
      const url = new URL((await link.getAttribute('href')) as string)
      expect(url.origin, 'the handoff is wa.me').toBe('https://wa.me')
      const text = url.searchParams.get('text') ?? ''
      expect(text, text).toContain(fx.stockSold)
      expect(
        locale === 'en' ? text.includes('has sold') : text.includes('sudah terjual'),
        text,
      ).toBe(true)
    })
  }

  test('no asking price anywhere: HTML, an RSC fetch, or a captured JSON response', async ({
    page,
  }) => {
    const bodies: string[] = []
    const pending: Promise<void>[] = []
    page.on('response', (res) => {
      const type = res.headers()['content-type'] ?? ''
      if (/text\/html|text\/x-component|application\/json/.test(type)) {
        pending.push(
          res.text().then(
            (text) => void bodies.push(text),
            () => {},
          ),
        )
      }
    })

    const works = [
      { ref: fx.available, stock: fx.stockAvailable },
      { ref: fx.sold, stock: fx.stockSold },
    ]
    for (const { ref, stock } of works) {
      const itemPath = href('item', { publicId: ref.publicId, slug: ref.slug }, 'en')
      await openFresh(page, itemPath, stock)
      await page.waitForLoadState('networkidle')
      bodies.push(await page.content())

      const flight = await api.get(`${BASE_URL}${itemPath}`, {
        headers: { Host: new URL(GALLERY_ORIGIN).host, RSC: '1' },
      })
      expect(flight.status(), `RSC ${itemPath}`).toBe(200)
      bodies.push(await flight.text())
    }
    await Promise.all(pending)

    const all = bodies.join('\n')
    expect(all, 'the captured bodies hold both works').toContain(fx.stockAvailable)
    expect(all).toContain(fx.stockSold)
    expect(all.toLowerCase().includes('askingprice'), 'no askingPrice').toBe(false)
    expect(figure(fx.availablePrice).test(all), 'no available price figure').toBe(false)
    expect(figure(fx.soldPrice).test(all), 'no sold price figure').toBe(false)
    expect(/\b(Rp|S\$|US\$)\s?\d|(^|[\s>(])\$\s?\d/.test(all), 'no currency figure').toBe(false)
  })
})

/** One screenshot under the report folder. */
async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

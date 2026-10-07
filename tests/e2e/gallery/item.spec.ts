/**
 * The gallery item page and deep zoom (TASKS.md 5.2.e Check), on a production build at 390 px:
 *
 * 1. The viewer zooms: no `iiif/` request before Zoom; then `info.json` and a tile, 200, from one
 *    `iiif/<asset>/` folder; holding `+` brings more tiles; no WebGL/texture/CORS console error.
 * 2. `uploads/` is 403 anonymously: Payload's file route and the bucket key itself.
 * 3. A sold work: "Sold", only "Ask for another example" (a `wa.me` link carrying the lexicon's
 *    sold message), never "Ask about this" or "Price on request" — in English and Indonesian.
 * 4. No asking price in the HTML, an `RSC: 1` fetch or any captured JSON, in both locales.
 *
 * Every word comes from the gallery lexicon. Fixtures (`support/item-fixtures.ts`): a place, a
 * grade, one large recto, two published works — removed in `afterAll` (`support/fixtures.ts`'s
 * `Ledger`, every delete checked); the WhatsApp number is set, then restored and read back.
 * Local (`E2E_PORT`) or remote (`E2E_BASE_GALLERY` + `E2E_BASE_SHOP`, `support/env.ts`).
 */
import {
  expect,
  request as newRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import en from '../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import id from '../../../engine/apps/web/src/sites/gallery/lexicon/id.json' with { type: 'json' }
import { createHref } from '../../../engine/packages/config/src/sites/routes/href'
import { SITES } from '../../../engine/packages/config/src/sites/table'
import {
  BASE_URL,
  GALLERY_BASE_URL,
  GALLERY_HOST_HEADER,
  GALLERY_ORIGIN,
  HOST_HEADER,
  OWNER,
} from './support/env'
import { newLedger, type Ledger } from './support/fixtures'
import { createItemFixtures, type ItemFixtures, type WorkRef } from './support/item-fixtures'

const href = createHref(SITES.gallery)
const LEXICON = { en, id } as const
type Locale = keyof typeof LEXICON
const say = (locale: Locale, key: keyof typeof en): string => LEXICON[locale][key]
const SHOTS = 'docs/reports/workers/5.2e'
const TEST_WHATSAPP = '+6590000001'
/** A price figure as the page could print it: plain, or grouped by `,` `.` or a space. */
const figure = (n: number) =>
  new RegExp(`(?<!\\d)${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[,. \\u00a0]?')}(?!\\d)`)

/** Opens a page until it renders this run's (unique) stock number: a reused `publicId` may answer
 * once with a deleted occupant's cached render. Claims are asserted after it, once. */
async function openFresh(page: Page, path: string, stockNumber: string) {
  await expect
    .poll(
      async () => {
        const res = await page.goto(`${GALLERY_ORIGIN}${path}`, { waitUntil: 'load' })
        return res?.status() === 200 && (await page.content()).includes(stockNumber)
      },
      { message: `${path} renders this run's fixture`, timeout: 30_000, intervals: [1_000] },
    )
    .toBe(true)
}

const itemPath = (ref: WorkRef, locale: Locale) =>
  href('item', { publicId: ref.publicId, slug: ref.slug }, locale)

test.describe.configure({ mode: 'serial' })

test.describe('Gallery item page and deep zoom (5.2.e)', () => {
  test.setTimeout(240_000)

  let api: APIRequestContext
  let ledger: Ledger
  let token: string
  let fx: ItemFixtures
  let settingsBefore: Record<string, unknown> | null = null

  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })
  const galleryOf = (settings: Record<string, unknown>) =>
    (settings.gallery ?? {}) as Record<string, unknown>

  test.beforeAll(async () => {
    test.setTimeout(300_000)
    api = await newRequest.newContext({ baseURL: BASE_URL })
    const login = await api.post(`${BASE_URL}/api/users/login`, {
      headers: HOST_HEADER,
      data: { email: OWNER.email, password: OWNER.password },
    })
    expect(login.status(), 'the owner signs in').toBe(200)
    token = ((await login.json()) as { token: string }).token
    ledger = newLedger(api)

    const before = await api.get(`${BASE_URL}/api/globals/site-settings?depth=0`, {
      headers: auth(),
    })
    expect(before.status(), 'the owner reads site-settings').toBe(200)
    settingsBefore = (await before.json()) as Record<string, unknown>
    const gallery = galleryOf(settingsBefore)
    const contact = (gallery.contact ?? {}) as Record<string, unknown>
    const patched = await api.post(`${BASE_URL}/api/globals/site-settings`, {
      headers: auth(),
      data: { gallery: { ...gallery, contact: { ...contact, whatsapp: TEST_WHATSAPP } } },
    })
    expect(patched.status(), 'set the test WhatsApp number').toBe(200)

    fx = await createItemFixtures(api, ledger, token)
  })

  test.afterAll(async () => {
    test.setTimeout(180_000)
    try {
      if (settingsBefore !== null) {
        const put = await api.post(`${BASE_URL}/api/globals/site-settings`, {
          headers: auth(),
          data: { gallery: galleryOf(settingsBefore) },
        })
        expect(put.status(), 'restore site-settings').toBe(200)
        const after = await api.get(`${BASE_URL}/api/globals/site-settings?depth=0`, {
          headers: auth(),
        })
        const restored = galleryOf((await after.json()) as Record<string, unknown>)
        expect(restored, 'site-settings read back as before').toEqual(galleryOf(settingsBefore))
      }
    } finally {
      await ledger?.cleanup()
      await api?.dispose()
    }
  })

  test('the viewer zooms and tiles load from iiif/, with no WebGL/texture/CORS error', async ({
    page,
  }) => {
    const requests: string[] = []
    const responses: { url: string; status: number }[] = []
    const consoleErrors: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    page.on('response', (r) => {
      if (/\/iiif\//.test(r.url())) responses.push({ url: r.url(), status: r.status() })
    })
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await openFresh(page, itemPath(fx.available, 'en'), fx.stockAvailable)
    expect(
      requests.filter((u) => /\/iiif\//.test(u)),
      'no iiif/ before the viewer',
    ).toEqual([])
    await shoot(page, '5.2e-item-before-zoom')

    await page.getByRole('button', { name: say('en', 'item.viewerOpen') }).click()
    const info = () => responses.find((r) => /\/iiif\/[^/]+\/info\.json$/.test(r.url))
    await expect.poll(() => info()?.status, { timeout: 30_000 }).toBe(200)
    const folder = info()!.url.replace(/info\.json$/, '')
    const tiles = () =>
      responses.filter((r) => r.url.startsWith(folder) && r.url.endsWith('/default.jpg'))
    await expect.poll(() => tiles().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1)
    await page.waitForLoadState('networkidle')
    await shoot(page, '5.2e-item-after-zoom')

    const beforeKey = tiles().length
    // Focus, not click: a click on OpenSeadragon's canvas zooms by itself.
    await page.getByRole('group', { name: fx.recto.alt }).locator('.openseadragon-canvas').focus()
    // OpenSeadragon 6 zooms 1% a frame while `+` is held (a tap is ≈10%, inside the home view's
    // one 512 px tile at 390 px), so the key is held as a visitor would, ≈1.5 s → ≈2.4×.
    await page.keyboard.down('+')
    await page.waitForTimeout(1_500)
    await page.keyboard.up('+')
    await expect.poll(() => tiles().length, { timeout: 30_000 }).toBeGreaterThan(beforeKey)
    await page.waitForLoadState('networkidle')
    await shoot(page, '5.2e-item-after-key-zoom')

    expect(
      tiles().filter((r) => r.status !== 200),
      'every tile answered 200',
    ).toEqual([])
    expect(
      requests.filter((u) => /\/uploads\/|\/api\/media\/file\//.test(u)),
      'the browser never asks for the private original',
    ).toEqual([])
    expect(
      consoleErrors.filter((text) => /webgl|texture|cors/i.test(text)),
      consoleErrors.join('\n'),
    ).toEqual([])
  })

  test('uploads/ is 403 anonymously, from the file route and from the bucket', async () => {
    const anon = await newRequest.newContext()
    try {
      const fileRoute = await anon.get(`${BASE_URL}/api/media/file/${fx.upload.filename}`, {
        headers: HOST_HEADER,
      })
      expect(fileRoute.status(), 'Payload file route, anonymous').toBe(403)
      // Controls: the file is there for staff, and the bucket address answers its public half.
      const staff = await api.get(`${BASE_URL}/api/media/file/${fx.upload.filename}`, {
        headers: auth(),
      })
      expect(staff.status(), 'Payload file route, as the owner').toBe(200)

      const page = await anon.get(`${GALLERY_BASE_URL}${itemPath(fx.available, 'en')}`, {
        headers: GALLERY_HOST_HEADER,
      })
      expect(page.status()).toBe(200)
      const infoUrl = /https?:\/\/[^"'\s\\]+\/iiif\/[^"'\s\\/]+\/info\.json/.exec(await page.text())
      expect(infoUrl, 'the page names its info.json').not.toBeNull()
      expect((await anon.get(infoUrl![0])).status(), 'info.json, anonymous').toBe(200)
      const bucket = infoUrl![0].replace(/\/iiif\/.*$/, '')
      const key = `${bucket}/${fx.upload.prefix}/${fx.upload.filename}`
      const original = await anon.get(key)
      expect(original.status(), `the bucket key itself, anonymous: ${key}`).toBe(403)
    } finally {
      await anon.dispose()
    }
  })

  for (const locale of ['en', 'id'] as const) {
    test(`a sold work says ${say(locale, 'status.sold')}, never "${say(locale, 'item.ask')}" (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openFresh(page, itemPath(fx.sold, locale), fx.stockSold)

      const panel = page.locator('aside[data-status="sold"]')
      await expect(panel.getByText(say(locale, 'status.sold'), { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: say(locale, 'item.ask') })).toHaveCount(0)
      // The whole document, head included: share cards and search snippets show the meta text.
      expect(await page.content(), 'in head').not.toContain(say(locale, 'price.onRequest'))
      await shoot(page, `5.2e-sold-${locale}`)

      const link = panel.getByRole('link', { name: say(locale, 'item.askAnother') })
      await expect(link).toBeVisible()
      const url = new URL((await link.getAttribute('href')) as string)
      expect(url.origin, 'the handoff is wa.me').toBe('https://wa.me')
      expect(url.pathname, 'the test number, digits only').toBe(`/${TEST_WHATSAPP.slice(1)}`)
      const expected = say(locale, 'whatsapp.soldItem')
        .replace('{stockNumber}', fx.stockSold)
        .replace('{title}', fx.soldTitle)
        .replace(/\s*\{url\}$/, '')
      expect(url.searchParams.get('text'), 'the lexicon sold message').toContain(expected)
    })
  }

  test('no asking price anywhere: HTML, an RSC fetch, or a captured JSON response', async ({
    page,
  }) => {
    const bodies: string[] = []
    const pending: Promise<void>[] = []
    let jsonResponses = 0
    page.on('response', (res) => {
      const type = res.headers()['content-type'] ?? ''
      if (/text\/html|text\/x-component|application\/json/.test(type)) {
        if (type.includes('json')) jsonResponses += 1
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
    for (const locale of ['en', 'id'] as const) {
      for (const { ref, stock } of works) {
        await openFresh(page, itemPath(ref, locale), stock)
        bodies.push(await page.content())
        const flight = await api.get(`${GALLERY_BASE_URL}${itemPath(ref, locale)}`, {
          headers: { ...GALLERY_HOST_HEADER, RSC: '1' },
        })
        expect(flight.status(), `RSC ${itemPath(ref, locale)}`).toBe(200)
        expect(flight.headers()['content-type'], 'a flight answer').toContain('text/x-component')
        bodies.push(await flight.text())
      }
    }
    // The available work's viewer, so its info.json (the one JSON a page load asks for) is read too.
    await openFresh(page, itemPath(fx.available, 'en'), fx.stockAvailable)
    await page.getByRole('button', { name: say('en', 'item.viewerOpen') }).click()
    await expect.poll(() => jsonResponses, { timeout: 30_000 }).toBeGreaterThanOrEqual(1)
    await Promise.all(pending)

    const all = bodies.join('\n')
    expect(all, 'the captured bodies hold both works').toContain(fx.stockAvailable)
    expect(all).toContain(fx.stockSold)
    expect(all.toLowerCase().includes('askingprice'), 'no askingPrice').toBe(false)
    expect(figure(fx.availablePrice).exec(all)?.[0], 'no available price figure').toBeUndefined()
    expect(figure(fx.soldPrice).exec(all)?.[0], 'no sold price figure').toBeUndefined()
    const currency = /(\b(Rp|SGD|USD|IDR|S\$|US\$)|(^|[\s>(])\$)\s?\d[\d.,]*/.exec(all)?.[0]
    expect(currency, 'no currency figure').toBeUndefined()
  })
})

/** One screenshot under the report folder. */
async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

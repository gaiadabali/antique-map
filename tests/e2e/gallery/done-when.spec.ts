/**
 * Phase 5 **Done when**, walked on a phone (390 × 844) against the seeded gallery (TASKS.md 5.5.d):
 * a visitor searches by a place's old name and opens the item; zooms into its detail; "Ask about
 * this" is a WhatsApp link carrying the item; "Sell to us" sends a form that appears as a lead (and
 * the owner's email); a sold item is marked Sold; axe is clean on every page walked. "No price,
 * cart or sign-in" is `no-commerce.spec.ts`; Lighthouse is `lighthouse/run.mjs`.
 *
 * Seeded data is only read. What the walk writes is its own and removed in `afterAll`, every delete
 * checked: the gallery's test WhatsApp/email channels (restored and read back), one sold `E2E` work
 * (`support/fixtures.ts`), the lead, and the run's Mailpit messages. Run with `--workers=1`.
 * Env: `E2E_BASE_GALLERY`/`E2E_BASE_SHOP`, `E2E_OWNER_*`, `MAILPIT_URL`; `E2E_OLD_NAME` (default
 * Batavia) and `E2E_OLD_NAME_ITEM` (the public id the old name must find, default 746 — P.1180).
 */
import AxeBuilder from '@axe-core/playwright'
import {
  expect,
  request as newRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import en from '../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import { createHref } from '../../../engine/packages/config/src/sites/routes/href'
import { SITES } from '../../../engine/packages/config/src/sites/table'
import { BASE_URL, GALLERY_ORIGIN, HOST_HEADER, OWNER } from './support/env'
import {
  createGalleryFixtures,
  newLedger,
  type GalleryFixtures,
  type Ledger,
} from './support/fixtures'

const href = createHref(SITES.gallery)
const say = (key: keyof typeof en): string => en[key]
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025'
const OLD_NAME = process.env.E2E_OLD_NAME ?? 'Batavia'
const OLD_NAME_ITEM = Number(process.env.E2E_OLD_NAME_ITEM ?? '746')
/** A seeded item with no tiles (640 px): the viewer must open its largest derivative. */
const SEEDED_ITEM = {
  publicId: 200,
  slug: 'the-new-governor-general-palace-in-the-koningsplein-batavia',
}
const TEST_WHATSAPP = '+6590000001'
const SHOTS = 'docs/gates/gallery'

async function shoot(page: Page, name: string) {
  await page.screenshot({
    path: `${SHOTS}/walk-${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}
async function axeClean(page: Page, what: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.length}`),
    `axe on ${what}`,
  ).toEqual([])
}

test.describe.configure({ mode: 'default' })
// A phone: 390 CSS px at 3 device pixels each, so cards pick the derivatives a real phone does.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

test.describe('Phase 5 Done when, at 390 px on staging', () => {
  test.setTimeout(180_000)
  let api: APIRequestContext
  let ledger: Ledger
  let fx: GalleryFixtures
  let token = ''
  let notifyEmail = ''
  let settingsBefore: Record<string, unknown> | null = null
  let soldPath = ''
  let soldStock = ''
  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })
  const galleryOf = (s: Record<string, unknown>) => (s.gallery ?? {}) as Record<string, unknown>
  const owner = async (path: string) => {
    const res = await api.get(`${BASE_URL}${path}`, { headers: auth() })
    expect(res.status(), `owner GET ${path}`).toBe(200)
    return res.json()
  }
  const mails = async (): Promise<{ ID: string }[]> => {
    const q = encodeURIComponent(`to:${notifyEmail}`)
    const res = await api.get(`${MAILPIT_URL}/api/v1/search?query=${q}&limit=50`)
    expect(res.status(), 'Mailpit search').toBe(200)
    return ((await res.json()) as { messages: { ID: string }[] }).messages
  }

  test.beforeAll(async () => {
    test.setTimeout(300_000)
    api = await newRequest.newContext()
    ledger = newLedger(api)
    fx = await createGalleryFixtures(api, ledger)
    const login = await api.post(`${BASE_URL}/api/users/login`, {
      headers: HOST_HEADER,
      data: { email: OWNER.email, password: OWNER.password },
    })
    expect(login.status(), 'the owner signs in').toBe(200)
    token = ((await login.json()) as { token: string }).token
    notifyEmail = `e2e-done-when.${Date.now()}@example.test`
    settingsBefore = (await owner('/api/globals/site-settings?depth=0')) as Record<string, unknown>
    const gallery = galleryOf(settingsBefore)
    const contact = (gallery.contact ?? {}) as Record<string, unknown>
    const patch = await api.post(`${BASE_URL}/api/globals/site-settings`, {
      headers: auth(),
      data: {
        gallery: {
          ...gallery,
          contact: { ...contact, whatsapp: TEST_WHATSAPP, email: notifyEmail },
          leadNotifyEmails: [notifyEmail],
        },
      },
    })
    expect(patch.status(), 'test channels').toBe(200)
    const title = encodeURIComponent(fx.publishedTitle)
    const found = (await owner(`/api/works?where[title][equals]=${title}&depth=0`)) as {
      docs: { id: number; publicId: number; slug: string }[]
    }
    expect(found.docs).toHaveLength(1)
    const work = found.docs[0]!
    soldStock = `M.DWE2E${Date.now()}`
    soldPath = href('item', { publicId: work.publicId, slug: work.slug }, 'en')
    const sold = await api.patch(`${BASE_URL}/api/works/${work.id}`, {
      headers: auth(),
      data: {
        status: 'sold',
        stockNumber: soldStock,
        title: fx.publishedTitle,
        _status: 'published',
      },
    })
    expect(sold.status(), 'mark the E2E work sold').toBe(200)
  })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    try {
      if (settingsBefore !== null) {
        const put = await api.post(`${BASE_URL}/api/globals/site-settings`, {
          headers: auth(),
          data: { gallery: galleryOf(settingsBefore) },
        })
        expect(put.status(), 'restore site-settings').toBe(200)
        const after = (await owner('/api/globals/site-settings?depth=0')) as Record<string, unknown>
        expect(galleryOf(after), 'site-settings as before').toEqual(galleryOf(settingsBefore))
      }
      const ids = (await mails()).map((m) => m.ID)
      if (ids.length > 0) {
        const del = await api.delete(`${MAILPIT_URL}/api/v1/messages`, { data: { IDs: ids } })
        expect(del.status(), "delete the run's mails").toBe(200)
      }
    } finally {
      await ledger?.cleanup()
      await api?.dispose()
    }
  })

  test(`searches by an old place name ("${OLD_NAME}") and opens the item`, async ({ page }) => {
    await page.goto(`${GALLERY_ORIGIN}${href('home', {}, 'en')}`, { waitUntil: 'load' })
    await page.goto(`${GALLERY_ORIGIN}${href('search', { q: '' }, 'en')}`, { waitUntil: 'load' })
    await page.getByLabel(say('search.label'), { exact: true }).fill(OLD_NAME)
    await page.getByRole('button', { name: say('search.submit'), exact: true }).click()
    const hit = page
      .locator(
        `main a[href="/product/${OLD_NAME_ITEM}"], main a[href^="/product/${OLD_NAME_ITEM}-"]`,
      )
      .first()
    await expect(hit, `the search lists public id ${OLD_NAME_ITEM}`).toBeVisible()
    await axeClean(page, 'search results')
    await shoot(page, '1-search-old-name')
    await hit.click()
    await expect(page).toHaveURL(new RegExp(`/product/${OLD_NAME_ITEM}-`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await shoot(page, '2-item-from-search')
  })

  test('opens an item, zooms into its detail, and Ask about this carries the item', async ({
    page,
  }) => {
    const cors: string[] = []
    page.on('console', (m) => void (/cors/i.test(m.text()) && cors.push(m.text())))
    // Arrive as a visitor does, from a listing whose card already loaded this image.
    const search = href('search', { q: 'Koningsplein' }, 'en')
    expect((await page.goto(`${GALLERY_ORIGIN}${search}`, { waitUntil: 'load' }))?.status()).toBe(
      200,
    )
    await page
      .locator(
        `main a[href="/product/${SEEDED_ITEM.publicId}"], main a[href^="/product/${SEEDED_ITEM.publicId}-"]`,
      )
      .first()
      .click()
    await expect(page).toHaveURL(`${GALLERY_ORIGIN}${href('item', SEEDED_ITEM, 'en')}`)
    const lead = page.locator('main img').first()
    await expect(lead).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(
      await lead.evaluate((i: HTMLImageElement) => i.naturalWidth),
      'the lead image',
    ).toBeGreaterThan(0)
    await expect(page.getByText(say('price.onRequest'), { exact: true })).toBeVisible()
    await axeClean(page, 'the item page')
    await page.getByRole('button', { name: say('item.viewerOpen') }).click()
    const viewer = page.locator('.openseadragon-canvas')
    await expect(viewer).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByText(say('item.viewerFailed')),
      'the viewer opens the image',
    ).toHaveCount(0)
    await page.getByRole('button', { name: say('item.zoomIn') }).click()
    await page.getByRole('button', { name: say('item.zoomIn') }).click()
    await page.waitForLoadState('networkidle')
    expect(cors, 'no CORS error').toEqual([])
    await shoot(page, '3-item-zoomed')

    const ask = page.getByRole('link', { name: say('item.ask') })
    const url = new URL((await ask.getAttribute('href')) as string)
    expect(url.origin, 'WhatsApp').toBe('https://wa.me')
    expect(url.pathname).toBe(`/${TEST_WHATSAPP.slice(1)}`)
    const text = url.searchParams.get('text') ?? ''
    const stock = (await page.getByText(/^Stock no\. /).innerText()).replace(/^Stock no\. /, '')
    const title = await page.getByRole('heading', { level: 1 }).innerText()
    expect(text, 'the message names the item').toContain(`${stock} — ${title}`)
  })

  test('Sell to us sends a form that appears as a lead, and the owner gets an email', async ({
    page,
  }) => {
    await page.goto(`${GALLERY_ORIGIN}${href('home', {}, 'en')}`, { waitUntil: 'load' })
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: say('footer.sellToUs'), exact: true })
      .click()
    await expect(page).toHaveURL(`${GALLERY_ORIGIN}${href('sellToUs', {}, 'en')}`)
    await axeClean(page, 'sell to us')
    const sellerEmail = `e2e-done-when-seller.${Date.now()}@example.test`
    await page.getByLabel(say('contactForm.name')).fill('E2E Done-when Seller')
    await page.getByLabel(say('contactForm.email')).fill(sellerEmail)
    await page.getByLabel(say('contactForm.messageSell')).fill('E2E walk-through: an 1880s chart.')
    await page.getByLabel(say('contactForm.consent')).check()
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 20_000,
    })
    const before = (await mails()).length
    const posted = page.waitForResponse((r) => r.url().endsWith('/api/x/leads'))
    await page.getByRole('button', { name: say('contactForm.submit') }).click()
    expect((await posted).status()).toBe(201)
    await expect(page.getByText(say('contactForm.successBody'))).toBeVisible()
    await shoot(page, '4-sell-to-us-sent')
    const q = `/api/leads?where[payload.email][equals]=${encodeURIComponent(sellerEmail)}&depth=0`
    const { docs } = (await owner(q)) as { docs: { id: number; kind: string; site: string }[] }
    for (const lead of docs) ledger.created.push({ collection: 'leads', id: lead.id })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ kind: 'sell', site: 'gallery' })
    const sent = async () => (await mails()).length
    await expect.poll(sent, { message: "the owner's email", timeout: 30_000 }).toBe(before + 1)
  })

  test('a sold item is marked Sold, with no enquiry as if available', async ({ page }) => {
    // Precondition: the page renders this run's work (its unique stock number), not a reused id's.
    const fresh = async () => {
      const res = await page.goto(`${GALLERY_ORIGIN}${soldPath}`, { waitUntil: 'load' })
      return res?.status() === 200 && (await page.content()).includes(soldStock)
    }
    await expect.poll(fresh, { message: 'the sold work renders', timeout: 30_000 }).toBe(true)
    const panel = page.locator('div[data-status="sold"]')
    await expect(panel.getByText(say('status.sold'), { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: say('item.ask') })).toHaveCount(0)
    await expect(panel.getByRole('link', { name: say('item.askAnother') })).toBeVisible()
    expect(await page.content(), 'no Price on request, head included').not.toContain(
      say('price.onRequest'),
    )
    await axeClean(page, 'a sold item')
    await shoot(page, '5-sold-item')
  })

  test('axe is clean on home and browse', async ({ page }) => {
    for (const [name, path] of [
      ['home', href('home', {}, 'en')],
      ['browse', href('browse', {}, 'en')],
    ] as const) {
      expect((await page.goto(`${GALLERY_ORIGIN}${path}`, { waitUntil: 'load' }))?.status()).toBe(
        200,
      )
      await axeClean(page, name)
      await shoot(page, `0-${name}`)
    }
  })
})

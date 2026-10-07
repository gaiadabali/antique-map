/**
 * The gallery's one end-to-end collector journey (TASKS.md 5.5.a; EXPERIENCE-GALLERY.md §4-§8):
 * search → item → zoom → Ask (link text) → Sell to us (lead created), at 390 px and 1280 px, in
 * English and Indonesian — four `test()`s sharing one fixture and site-settings patch, run `serial`.
 *
 * Two adaptations, both pre-existing product gaps outside this file's owned path:
 * - **No header search yet**: `shell/site-shell.tsx`'s header has the logo, the nav, the locale
 *   switcher and an inert chat button only (home links nowhere to `/search` either). The journey
 *   opens the home, then reaches `/search` at its own address (`browse.spec.ts`'s way).
 * - **Esc does not close the viewer yet**: `zoom-lazy.tsx` swaps its button for `<ZoomViewer>` with
 *   no way back (only `ZoomShell`'s Fullscreen-API button, flagged in TASKS.md as "not §6's
 *   overlay"). Esc is pressed as the journey describes; nothing is asserted about it closing.
 *
 * Fixtures: `support/fixtures.ts`'s `createGalleryFixtures` and `contact.spec.ts`'s pattern for the
 * test WhatsApp/email channels and the work's stock number — reused, not duplicated. The seeded
 * recto is under 2400 px (no IIIF pyramid): zoom asserts only that the viewer opens and shows the
 * image, not tiles (5.2.e's claim).
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
import {
  createGalleryFixtures,
  newLedger,
  type GalleryFixtures,
  type Ledger,
} from './support/fixtures'

const href = createHref(SITES.gallery)
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025'
const STOCK_NUMBER_PREFIX = 'M.55AE2E'
const SELLER_EMAIL_PREFIX = 'e2e-5.5a-seller'
/** An unusable test value, not a real number (`contact.spec.ts`'s pattern). */
const TEST_WHATSAPP = '+6590000001'
/** `support/fixtures.ts`'s published recto alt — the viewer's `role="group"` name once it opens. */
const RECTO_ALT = 'A harbour chart, whole sheet'
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A just-published work's freshness window (`browse.spec.ts`'s `FRESH`): the write's `after()`
 * revalidation, not a cache lifetime — a stale cached search answers here otherwise. */
const FRESH = 30_000

const SHOTS = 'docs/reports/workers/5.5a'
async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

type LocaleCode = 'en' | 'id'
const LOCALES: readonly LocaleCode[] = ['en', 'id']
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

/** Every locale-bound word the journey asserts, from the gallery's lexicon (`lexicon/en.json`,
 * `lexicon/id.json`) — never hard-coded in one language alone. */
const TEXT = {
  en: {
    priceOnRequest: 'Price on request',
    zoomOpen: 'Zoom into the image',
    askLabel: 'Ask about this',
    whatsappPrefix: (stockNumber) => `Hello, I am interested in ${stockNumber} — `,
    searchLabel: 'Search for',
    searchSubmit: 'Search',
    footerSellToUs: 'Sell to us',
    formName: 'Your name',
    formEmail: 'Email address',
    formMessage: 'What do you have?',
    consent: /I agree that Indies Gallery/,
    submit: 'Send message',
    thankYou: 'We reply the same working day, Singapore time',
  },
  id: {
    priceOnRequest: 'Harga atas permintaan',
    zoomOpen: 'Perbesar gambar',
    askLabel: 'Tanyakan tentang ini',
    whatsappPrefix: (stockNumber) => `Halo, saya tertarik dengan ${stockNumber} — `,
    searchLabel: 'Cari',
    searchSubmit: 'Cari',
    footerSellToUs: 'Jual ke kami',
    formName: 'Nama Anda',
    formEmail: 'Alamat email',
    formMessage: 'Apa yang Anda punya?',
    consent: /Saya setuju Indies Gallery/,
    submit: 'Kirim pesan',
    thankYou: 'Kami membalas di hari kerja yang sama, waktu Singapura',
  },
}

test.describe.configure({ mode: 'serial' })

test.describe('The gallery journey (5.5.a)', () => {
  test.setTimeout(180_000)

  let fx: GalleryFixtures
  let api: APIRequestContext
  let ledger: Ledger
  let token: string | null = null
  let stockNumber: string
  let notifyEmail: string
  let settingsBefore: Record<string, unknown> | null = null

  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

  test.beforeAll(async () => {
    test.setTimeout(180_000)
    api = await newRequest.newContext({ baseURL: BASE_URL })
    ledger = newLedger(api)
    fx = await createGalleryFixtures(api, ledger)
    token = await signIn(api)
    const stamp = Date.now()
    stockNumber = `${STOCK_NUMBER_PREFIX}${stamp}`
    notifyEmail = `e2e-5.5a-notify.${stamp}@example.test`

    const before = await api.get(`${BASE_URL}/api/globals/site-settings`, { headers: auth() })
    expect(before.ok(), `owner reads site-settings: ${before.status()}`).toBeTruthy()
    settingsBefore = (await before.json()) as Record<string, unknown>
    const gallery = (settingsBefore.gallery ?? {}) as Record<string, unknown>
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
    expect(patch.ok(), `owner sets the gallery's test channels: ${patch.status()}`).toBeTruthy()

    const { id } = await publishedWork()
    // A plain PATCH merges the fixture's own draft revision in unless both are named again.
    const stock = await api.patch(`${BASE_URL}/api/works/${id}`, {
      headers: auth(),
      data: { stockNumber, title: fx.publishedTitle, _status: 'published' },
    })
    expect(stock.ok(), `PATCH the published work's stock number: ${stock.status()}`).toBeTruthy()
  })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    try {
      if (settingsBefore !== null && token !== null) {
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

  async function signIn(request: APIRequestContext): Promise<string> {
    const login = await request.post(`${BASE_URL}/api/users/login`, {
      headers: HOST_HEADER,
      data: { email: OWNER.email, password: OWNER.password },
    })
    expect(login.ok(), 'the owner signs in').toBeTruthy()
    return ((await login.json()) as { token: string }).token
  }

  async function publishedWork(): Promise<{ id: number }> {
    const res = await api.get(
      `${BASE_URL}/api/works?where[title][equals]=${encodeURIComponent(fx.publishedTitle)}&limit=1&depth=0`,
      { headers: auth() },
    )
    expect(res.ok(), `owner reads the published work: ${res.status()}`).toBeTruthy()
    const docs = ((await res.json()) as { docs: { id: number }[] }).docs
    expect(docs.length, 'the published fixture is found').toBe(1)
    return docs[0]!
  }

  async function mailTo(address: string): Promise<{ Subject: string } | undefined> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const found = await api.get(
        `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
      )
      expect(found.ok(), `Mailpit search: ${found.status()}`).toBeTruthy()
      const first = ((await found.json()) as { messages?: { ID: string }[] }).messages?.[0]
      if (first !== undefined) {
        const one = await api.get(`${MAILPIT_URL}/api/v1/message/${first.ID}`)
        expect(one.ok(), `Mailpit message: ${one.status()}`).toBeTruthy()
        return (await one.json()) as { Subject: string }
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    return undefined
  }

  for (const locale of LOCALES) {
    for (const viewport of WIDTHS) {
      const label = `${locale} ${viewport.width}px`
      const shots = viewport.width === 390

      test(`${label}: search → item → zoom → Ask → Sell to us`, async ({ page }) => {
        const t = TEXT[locale]
        await page.setViewportSize(viewport)

        // search (see file header for the header-search adaptation)
        const home = await page.goto(`${GALLERY_ORIGIN}${href('home', {}, locale)}`, {
          waitUntil: 'load',
        })
        expect(home?.status(), 'home').toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (shots) await shoot(page, `${locale}-1-home`)

        const result = page.getByRole('link', { name: new RegExp(escape(fx.publishedTitle)) })
        await expect(async () => {
          const searchRes = await page.goto(
            `${GALLERY_ORIGIN}${href('search', { q: '' }, locale)}`,
            { waitUntil: 'load' },
          )
          expect(searchRes?.status(), 'search').toBe(200)
          await page.getByLabel(t.searchLabel).fill('Batavia')
          await page.getByRole('button', { name: t.searchSubmit }).click()
          await expect(result).toBeVisible({ timeout: 2_000 })
        }, 'the work published moments ago is listed (a stale cached search fails here)').toPass({
          timeout: FRESH,
        })
        if (shots) await shoot(page, `${locale}-2-search`)

        // item
        await result.click()
        await expect(page.getByRole('heading', { level: 1 })).toContainText(fx.publishedTitle)
        await expect(page.getByText(t.priceOnRequest, { exact: true })).toBeVisible()
        if (shots) await shoot(page, `${locale}-3-item`)

        // zoom (no tiles claim, see file header)
        await page.getByRole('button', { name: t.zoomOpen }).click()
        await expect(page.getByRole('group', { name: RECTO_ALT })).toBeVisible()
        if (shots) await shoot(page, `${locale}-4-zoom`)
        await page.keyboard.press('Escape') // no close yet, see file header

        // Ask (link text)
        const ask = page.getByRole('link', { name: t.askLabel })
        await expect(ask).toBeVisible()
        const askUrl = new URL((await ask.getAttribute('href')) as string)
        expect(askUrl.origin, 'the handoff is wa.me').toBe('https://wa.me')
        expect(askUrl.pathname, 'the test number, digits only').toBe(`/${TEST_WHATSAPP.slice(1)}`)
        const askText = askUrl.searchParams.get('text') ?? ''
        expect(askText.startsWith(t.whatsappPrefix(stockNumber)), askText).toBe(true)
        expect(askText, 'the prepared message names the title').toContain(fx.publishedTitle)

        // Sell to us (lead created)
        await page
          .getByRole('contentinfo')
          .getByRole('link', { name: t.footerSellToUs, exact: true })
          .click()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (shots) await shoot(page, `${locale}-5-sell-to-us`)

        const sellerEmail = `${SELLER_EMAIL_PREFIX}.${locale}.${viewport.width}.${Date.now()}@example.test`
        const message = `E2E 5.5a (${locale}, ${viewport.width}px): an 1880s chart of Sumatra.`
        await page.getByLabel(t.formName).fill('E2E Journey Seller')
        await page.getByLabel(t.formEmail).fill(sellerEmail)
        await page.getByLabel(t.formMessage).fill(message)
        await page.getByLabel(t.consent).check()
        await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
          timeout: 20_000,
        })
        const posted = page.waitForResponse((r) => r.url().endsWith('/api/x/leads'))
        await page.getByRole('button', { name: t.submit }).click()
        const answer = await posted
        expect(answer.status(), 'the route accepts the visitor’s sell lead').toBe(201)
        await expect(page.getByText(t.thankYou)).toBeVisible()
        if (shots) await shoot(page, `${locale}-6-thank-you`)

        // a `leads` row with kind `sell` exists (owner REST read)
        const found = await api.get(
          `${BASE_URL}/api/leads?where[payload.email][equals]=${encodeURIComponent(sellerEmail)}&limit=2&depth=0`,
          { headers: auth() },
        )
        expect(found.ok(), `owner reads the leads: ${found.status()}`).toBeTruthy()
        type Lead = { kind: string; site: string; payload: { email: string } }
        const docs = ((await found.json()) as { docs: Lead[] }).docs
        expect(docs, 'exactly one lead for the one send').toHaveLength(1)
        expect(docs[0]!.kind).toBe('sell')
        expect(docs[0]!.site).toBe('gallery')
        expect(docs[0]!.payload.email).toBe(sellerEmail)

        // and a Mailpit message arrived
        const mail = await mailTo(notifyEmail)
        expect(mail, `the owner's email about the lead in Mailpit (${label})`).toBeDefined()
      })
    }
  }
})

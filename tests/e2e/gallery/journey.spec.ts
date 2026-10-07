/**
 * The gallery's one end-to-end collector journey (TASKS.md 5.5.a; EXPERIENCE-GALLERY.md §4-§8):
 * search → item → zoom → Ask (link text) → Sell to us (a lead and the owner's email), at 390 px and
 * 1280 px, in English and Indonesian — four `test()`s sharing one fixture, run `serial`.
 *
 * - **Search** starts at the home page, then the search page: the header has no search box yet
 *   (a product gap, reported), so the visitor types the historical place name into `/search`'s
 *   own field. Nothing in the work's title, alt or place name says "Batavia" — only the place's
 *   historical name does (`support/fixtures.ts`).
 * - **Zoom** asserts the viewer opens and draws the image (a 200 derivative from the media
 *   origin, no "cannot be opened" notice). The recto is 1×1 px, so there are no tiles — those are
 *   5.2.e's claim. The viewer has no close (Esc) yet: reported, not pretended.
 * - **Ask** is the exact lexicon `whatsapp.item` message for this work and its canonical address.
 * - **Sell to us** is reached from the footer; the send answers 201, one `sell` lead exists (owner
 *   REST read), and exactly one more Mailpit message reaches the run's notify address.
 *
 * Fixtures: `support/fixtures.ts` (place, grade, published work + draft twin) and the run's test
 * channels in site-settings, restored and read back in `afterAll`; each lead is deleted with the
 * ledger, and the run's Mailpit messages are deleted too. Local or remote (`support/env.ts`).
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
import {
  createGalleryFixtures,
  newLedger,
  type GalleryFixtures,
  type Ledger,
} from './support/fixtures'

const href = createHref(SITES.gallery)
const LEXICON = { en, id } as const
type Locale = keyof typeof LEXICON
const say = (locale: Locale, key: keyof typeof en): string => LEXICON[locale][key]
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025'
const TEST_WHATSAPP = '+6590000001'
/** `support/fixtures.ts`'s published recto alt — the viewer's `role="group"` name once it opens. */
const RECTO_ALT = 'A harbour chart, whole sheet'
const SHOTS = 'docs/reports/workers/5.5a'
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

test.describe.configure({ mode: 'serial' })

test.describe('The gallery journey (5.5.a)', () => {
  test.setTimeout(180_000)

  let fx: GalleryFixtures
  let api: APIRequestContext
  let ledger: Ledger
  let token = ''
  let stockNumber: string
  let notifyEmail: string
  let settingsBefore: Record<string, unknown> | null = null

  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })
  const galleryOf = (s: Record<string, unknown>) => (s.gallery ?? {}) as Record<string, unknown>
  const owner = async (path: string) => {
    const res = await api.get(`${BASE_URL}${path}`, { headers: auth() })
    expect(res.status(), `owner GET ${path}`).toBe(200)
    return res.json()
  }

  /** The Mailpit messages to the run's notify address, newest first. */
  const mails = async (): Promise<{ ID: string; Subject: string }[]> => {
    const query = encodeURIComponent(`to:${notifyEmail}`)
    const res = await api.get(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=50`)
    expect(res.status(), 'Mailpit search').toBe(200)
    return ((await res.json()) as { messages: { ID: string; Subject: string }[] }).messages
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
    const stamp = Date.now()
    stockNumber = `M.55AE2E${stamp}`
    notifyEmail = `e2e-5.5a-notify.${stamp}@example.test`

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
    expect(patch.status(), "owner sets the gallery's test channels").toBe(200)

    const title = encodeURIComponent(fx.publishedTitle)
    type Work = { id: number; images: { media: number }[] }
    const { docs } = (await owner(`/api/works?where[title][equals]=${title}&depth=0`)) as {
      docs: Work[]
    }
    expect(docs, 'the published fixture').toHaveLength(1)
    // A plain PATCH merges the fixture's own draft revision in unless both are named again.
    const stock = await api.patch(`${BASE_URL}/api/works/${docs[0]!.id}`, {
      headers: auth(),
      data: { stockNumber, title: fx.publishedTitle, _status: 'published' },
    })
    expect(stock.status(), "PATCH the work's stock number").toBe(200)
    // The public image is the recto's derivative: wait (failing hard) for the pipeline.
    const media = docs[0]!.images[0]!.media
    await expect
      .poll(
        async () =>
          ((await owner(`/api/media/${media}?depth=0`)) as { derivatives?: { status?: string } })
            .derivatives?.status,
        {
          message: `media ${media} derivatives ready`,
          timeout: 180_000,
          intervals: [2_000],
        },
      )
      .toBe('ready')
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
        expect(galleryOf(after), 'site-settings read back as before').toEqual(
          galleryOf(settingsBefore),
        )
      }
      if (notifyEmail !== undefined) {
        const ids = (await mails()).map((m) => m.ID)
        if (ids.length > 0) {
          const del = await api.delete(`${MAILPIT_URL}/api/v1/messages`, { data: { IDs: ids } })
          expect(del.status(), "delete the run's Mailpit messages").toBe(200)
        }
      }
    } finally {
      await ledger?.cleanup()
      await api?.dispose()
    }
  })

  for (const locale of ['en', 'id'] as const) {
    for (const viewport of WIDTHS) {
      const label = `${locale} ${viewport.width}px`
      const shots = viewport.width === 390

      test(`${label}: search → item → zoom → Ask → Sell to us`, async ({ page }) => {
        const searchPath = href('search', { q: 'Batavia' }, locale)
        // Precondition, not a claim: the work published moments ago has reached the cached search.
        await expect
          .poll(
            async () => {
              const res = await api.get(`${GALLERY_BASE_URL}${searchPath}`, {
                headers: GALLERY_HOST_HEADER,
              })
              return res.status() === 200 && (await res.text()).includes(fx.publishedTitle)
            },
            { message: 'the search lists the new work', timeout: 60_000, intervals: [2_000] },
          )
          .toBe(true)
        await page.setViewportSize(viewport)

        // home, then search
        const home = await page.goto(`${GALLERY_ORIGIN}${href('home', {}, locale)}`, {
          waitUntil: 'load',
        })
        expect(home?.status(), 'home').toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (shots) await shoot(page, `${locale}-1-home`)
        await page.goto(`${GALLERY_ORIGIN}${href('search', { q: '' }, locale)}`, {
          waitUntil: 'load',
        })
        await page.getByLabel(say(locale, 'search.label'), { exact: true }).fill('Batavia')
        await page.getByRole('button', { name: say(locale, 'search.submit'), exact: true }).click()
        const result = page.getByRole('link', { name: fx.publishedTitle })
        await expect(result).toBeVisible()
        await expect(page.getByText(fx.draftTitle)).toHaveCount(0)
        if (shots) await shoot(page, `${locale}-2-search`)

        // item
        await result.click()
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(fx.publishedTitle)
        await expect(page.getByText(say(locale, 'price.onRequest'), { exact: true })).toBeVisible()
        if (shots) await shoot(page, `${locale}-3-item`)

        // zoom
        const images: { url: string; status: number }[] = []
        page.on('response', (r) => {
          if (/\/derivatives\//.test(r.url())) images.push({ url: r.url(), status: r.status() })
        })
        await page.getByRole('button', { name: say(locale, 'item.viewerOpen') }).click()
        await expect(page.getByRole('group', { name: RECTO_ALT })).toBeVisible()
        await expect
          .poll(() => images.some((r) => r.status === 200), { timeout: 20_000 })
          .toBe(true)
        await expect(page.getByText(say(locale, 'item.viewerFailed'))).toHaveCount(0)
        if (shots) await shoot(page, `${locale}-4-zoom`)

        // Ask: the exact lexicon message, naming this work and its canonical address
        const ask = page.getByRole('link', { name: say(locale, 'item.ask') })
        await expect(ask).toBeVisible()
        const askUrl = new URL((await ask.getAttribute('href')) as string)
        expect(askUrl.origin, 'the handoff is wa.me').toBe('https://wa.me')
        expect(askUrl.pathname, 'the test number, digits only').toBe(`/${TEST_WHATSAPP.slice(1)}`)
        const here = new URL(page.url())
        const expected = say(locale, 'whatsapp.item')
          .replace('{stockNumber}', stockNumber)
          .replace('{title}', fx.publishedTitle)
          .replace('{url}', `${here.origin}${here.pathname}`)
        expect(askUrl.searchParams.get('text'), 'the prepared message').toBe(expected)

        // Sell to us, from the footer
        await page
          .getByRole('contentinfo')
          .getByRole('link', { name: say(locale, 'footer.sellToUs'), exact: true })
          .click()
        await expect(page).toHaveURL(`${GALLERY_ORIGIN}${href('sellToUs', {}, locale)}`)
        if (shots) await shoot(page, `${locale}-5-sell-to-us`)
        const sellerEmail = `e2e-5.5a-seller.${locale}.${viewport.width}.${Date.now()}@example.test`
        await page.getByLabel(say(locale, 'contactForm.name')).fill('E2E Journey Seller')
        await page.getByLabel(say(locale, 'contactForm.email')).fill(sellerEmail)
        await page
          .getByLabel(say(locale, 'contactForm.messageSell'))
          .fill(`E2E 5.5a (${label}): an 1880s chart.`)
        await page.getByLabel(say(locale, 'contactForm.consent')).check()
        await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
          timeout: 20_000,
        })
        const mailsBefore = (await mails()).length
        const posted = page.waitForResponse((r) => r.url().endsWith('/api/x/leads'))
        await page.getByRole('button', { name: say(locale, 'contactForm.submit') }).click()
        expect((await posted).status(), "the route accepts the visitor's sell lead").toBe(201)
        await expect(page.getByText(say(locale, 'contactForm.successBody'))).toBeVisible()
        if (shots) await shoot(page, `${locale}-6-thank-you`)

        // one `sell` lead (owner REST read), on the ledger for deletion
        type Lead = { id: number; kind: string; site: string; payload: { email: string } }
        const email = encodeURIComponent(sellerEmail)
        const { docs } = (await owner(
          `/api/leads?where[payload.email][equals]=${email}&depth=0`,
        )) as {
          docs: Lead[]
        }
        for (const lead of docs) ledger.created.push({ collection: 'leads', id: lead.id })
        expect(docs, 'exactly one lead for the one send').toHaveLength(1)
        expect(docs[0]).toMatchObject({
          kind: 'sell',
          site: 'gallery',
          payload: { email: sellerEmail },
        })

        // and exactly one more email to the owner's notify address
        await expect
          .poll(async () => (await mails()).length, {
            message: `the owner's email (${label})`,
            timeout: 30_000,
          })
          .toBe(mailsBefore + 1)
      })
    }
  }
})

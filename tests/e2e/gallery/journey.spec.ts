/**
 * The gallery's collector journey (TASKS.md 5.5.a; EXPERIENCE-GALLERY.md §4-§8): search → item →
 * zoom → Ask → Sell to us, at 390 and 1280 px, in en and id. Home first, then `/search`'s own field
 * (the header has no search yet — reported); only the place's historical name says "Batavia".
 * Zoom: the viewer opens and draws its 1320 px recto (no tiles under 2400 px — 5.2.e's claim); it
 * has no close (Esc) yet — reported. Ask is the exact lexicon `whatsapp.item` text. Sell to us, from
 * the footer: 201, one `sell` lead (owner read) and exactly one more Mailpit message to the run's
 * notify address. Fixtures: `support/fixtures.ts`, the journey's own recto, the test channels in
 * site-settings (restored and read back); leads and the run's mails are deleted. `support/env.ts`.
 */
import { readFileSync } from 'node:fs'

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
} from './support/env'
import {
  createGalleryFixtures,
  newLedger,
  signIn,
  type GalleryFixtures,
  type Ledger,
} from './support/fixtures'

const href = createHref(SITES.gallery)
const LEXICON = { en, id } as const
type Locale = keyof typeof LEXICON
const say = (locale: Locale, key: keyof typeof en): string => LEXICON[locale][key]
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025'
const TEST_WHATSAPP = '+6590000001'
/** The journey's own recto (a real 1320×970 map) and its alt: the viewer's `role="group"` name. */
const RECTO_FILE = 'docs/design/input/claude-design-2026-09/assets/about-map.jpeg'
const RECTO_ALT = 'E2E 5.5a recto, a map of the archipelago'
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

// One worker (`--workers=1`): the run's site-settings channels are shared. Not `serial`, so a
// failed width or locale still lets the other three run and report.
test.describe.configure({ mode: 'default' })

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
    token = await signIn(api)
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

    // A real recto: the shared fixture's 1×1 PNG fails the derivative pipeline (reported), and
    // the public page shows only a derivative. On the ledger's far end, so it goes after the work.
    const recto = await api.post(`${BASE_URL}/api/media`, {
      headers: auth(),
      multipart: {
        _payload: JSON.stringify({
          alt: RECTO_ALT,
          altSource: 'cataloguer',
          subject: 'work',
          role: 'recto',
          provenance: 'photograph',
        }),
        file: {
          name: `e2e-55a-recto-${stamp}.jpeg`,
          mimeType: 'image/jpeg',
          buffer: readFileSync(RECTO_FILE),
        },
      },
    })
    expect(recto.status(), 'upload the journey recto').toBe(201)
    const media = ((await recto.json()) as { doc: { id: number } }).doc.id
    ledger.created.unshift({ collection: 'media', id: media })

    const title = encodeURIComponent(fx.publishedTitle)
    const found = (await owner(`/api/works?where[title][equals]=${title}&depth=0`)) as {
      docs: { id: number }[]
    }
    expect(found.docs, 'the published fixture').toHaveLength(1)
    // A plain PATCH merges the fixture's own draft revision in unless both are named again.
    const work = await api.patch(`${BASE_URL}/api/works/${found.docs[0]!.id}`, {
      headers: auth(),
      data: { stockNumber, images: [{ media }], title: fx.publishedTitle, _status: 'published' },
    })
    expect(work.status(), "PATCH the work's stock number and recto").toBe(200)
    type Media = { derivatives?: { status?: string } }
    const status = async () => ((await owner(`/api/media/${media}`)) as Media).derivatives?.status
    await expect.poll(status, { message: 'derivatives', timeout: 180_000 }).toBe('ready')
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

        // zoom: the viewer opens and draws (soft, so a failure still runs Ask and Sell to us)
        const cors: string[] = []
        page.on('console', (m) => void (/cors/i.test(m.text()) && cors.push(m.text())))
        await page.getByRole('button', { name: say(locale, 'item.viewerOpen') }).click()
        await expect(page.getByRole('group', { name: RECTO_ALT })).toBeVisible()
        await page.waitForLoadState('networkidle') // the item page has no Turnstile
        const failed = page.getByText(say(locale, 'item.viewerFailed'))
        await expect.soft(failed, 'the viewer opens the image').toHaveCount(0)
        expect.soft(cors, 'no CORS error').toEqual([])
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
        const leads = `/api/leads?where[payload.email][equals]=${email}&depth=0`
        const { docs } = (await owner(leads)) as { docs: Lead[] }
        for (const lead of docs) ledger.created.push({ collection: 'leads', id: lead.id })
        expect(docs, 'exactly one lead for the one send').toHaveLength(1)
        const lead = { kind: 'sell', site: 'gallery', payload: { email: sellerEmail } }
        expect(docs[0]).toMatchObject(lead)

        // and exactly one more email to the owner's notify address
        const sent = async () => (await mails()).length
        await expect
          .poll(sent, { message: "the owner's email", timeout: 30_000 })
          .toBe(mailsBefore + 1)
      })
    }
  }
})

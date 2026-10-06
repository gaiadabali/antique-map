/**
 * The gallery's contact surface (TASKS.md 5.3.d; EXPERIENCE-GALLERY.md §8):
 *
 * 1. At 390 px the item page's "Ask about this" is a `wa.me` URL whose decoded text carries the
 *    work's stock number, its title and its clean canonical URL — the §8 handoff from the lexicon.
 *    Once the work is sold, the panel says Sold and offers "Ask for another example" with the
 *    sold message, never "Ask about this" (the owner's decision of 2026-10-06).
 * 2. A visitor fills the Sell-to-us form at 390 px and sends it: one `leads` row the owner reads,
 *    and the owner's email about it in Mailpit. The server runs with Turnstile's always-pass test
 *    pair — site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` —
 *    so the widget hands the form a dummy token and `siteverify` passes it.
 *
 * The route's refusals (bot-like, oversize, a renamed `.exe`, the eleventh post) are
 * `leads-route.spec.ts`.
 * 3. axe is clean on `/sell-to-us` and `/contact` at 390 and 1280 px.
 *
 * Fixtures follow `support/fixtures.ts`: the browse suite's published work (made in `beforeAll`,
 * removed in `afterAll` through the ledger), PATCHed to carry a stock number — the wa.me text
 * names it first. PATCHing a work with drafts enabled merges its latest draft version into the
 * published doc, so the PATCH names the title explicitly again. The gallery's site-settings gain
 * a test WhatsApp number, contact email and lead-notify list for the run (the owner's "new lead"
 * email only sends when one is configured, and carries no visitor data by design) and are put
 * back afterwards. The owner's REST reads go to the shop host (`HOST_HEADER`, Q1).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, request as newRequest, test, type APIRequestContext } from '@playwright/test'

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
/** The e2e's own distinctive values: the stock number and the visitor who sells to us. */
const STOCK_NUMBER_PREFIX = 'M.53E2E'
const SELLER_EMAIL_PREFIX = 'e2e-5.3-seller'
/** The gallery's test WhatsApp number for the run (an unusable test value, not a real one). */
const TEST_WHATSAPP = '+6590000000'
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

test.describe.configure({ mode: 'default' })

test.describe('Gallery contact (5.3.d)', () => {
  test.setTimeout(120_000)

  let fx: GalleryFixtures
  let api: APIRequestContext
  let ledger: Ledger
  let token: string | null = null
  let stockNumber: string
  let sellerEmail: string
  let notifyEmail: string
  /** The site-settings values the run changes, put back in `afterAll`. */
  let settingsBefore: Record<string, unknown> | null = null

  const auth = () => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

  test.beforeAll(async () => {
    test.setTimeout(180_000)
    api = await newRequest.newContext({ baseURL: BASE_URL })
    ledger = newLedger(api)
    fx = await createGalleryFixtures(api, ledger)
    token = await signIn(api)
    // The run's own distinctive values: the stock number, the visitor who sells to us, and the
    // address the owner's lead email goes to (this worktree's Mailpit).
    const stamp = Date.now()
    stockNumber = `${STOCK_NUMBER_PREFIX}${stamp}`
    sellerEmail = `${SELLER_EMAIL_PREFIX}.${stamp}@example.test`
    notifyEmail = `e2e-5.3-notify.${stamp}@example.test`
    // The gallery's channels: without a WhatsApp number and email in site-settings the handoff
    // links are `null` (OA2) and no lead email is sent — this run needs both, and restores both.
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
    // The item handoff names the work's stock number first: give the published fixture one.
    // PATCHing a work with drafts enabled merges its latest draft version in, so the title is
    // named explicitly again.
    const { id } = await publishedWork()
    const stock = await api.patch(`${BASE_URL}/api/works/${id}`, {
      headers: auth(),
      data: { stockNumber, title: fx.publishedTitle },
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

  type Work = { id: number; publicId: number; slug: string; stockNumber: string | null }

  /** The published fixture's work record, read by the owner. */
  async function publishedWork(): Promise<Work> {
    const res = await api.get(
      `${BASE_URL}/api/works?where[title][equals]=${encodeURIComponent(fx.publishedTitle)}&limit=1&depth=0`,
      { headers: auth() },
    )
    expect(res.ok(), `owner reads the published work: ${res.status()}`).toBeTruthy()
    const docs = ((await res.json()) as { docs: Work[] }).docs
    expect(docs.length, 'the published fixture is found').toBe(1)
    return docs[0]!
  }

  /** The newest Mailpit message to `address`, polled while the owner's email is sent. */
  async function mailTo(address: string): Promise<{ Subject: string; Text: string } | undefined> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const found = await api.get(
        `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
      )
      expect(found.ok(), `Mailpit search: ${found.status()}`).toBeTruthy()
      const first = ((await found.json()) as { messages?: { ID: string }[] }).messages?.[0]
      if (first !== undefined) {
        const one = await api.get(`${MAILPIT_URL}/api/v1/message/${first.ID}`)
        expect(one.ok(), `Mailpit message: ${one.status()}`).toBeTruthy()
        return (await one.json()) as { Subject: string; Text: string }
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    return undefined
  }

  test("the item page's Ask link is a wa.me URL naming the stock number and title (390 px)", async ({
    page,
  }) => {
    const work = await publishedWork()
    expect(work.stockNumber, 'the fixture carries its stock number').toBe(stockNumber)
    const itemPath = href('item', { publicId: work.publicId, slug: work.slug }, 'en')
    await page.setViewportSize({ width: 390, height: 844 })
    const res = await page.goto(`${GALLERY_ORIGIN}${itemPath}`, { waitUntil: 'networkidle' })
    expect(res?.status(), itemPath).toBe(200)
    const ask = page.getByRole('link', { name: 'Ask about this' })
    await expect(ask).toBeVisible()
    const url = new URL((await ask.getAttribute('href')) as string)
    expect(url.origin, 'the handoff is wa.me').toBe('https://wa.me')
    expect(url.pathname, 'the test number, digits only').toBe(`/${TEST_WHATSAPP.slice(1)}`)
    const text = url.searchParams.get('text') ?? ''
    expect(text.startsWith(`Hello, I am interested in ${stockNumber} — `), text).toBe(true)
    expect(text, 'the prepared message names the title').toContain(fx.publishedTitle)
    expect(text.endsWith(itemPath), 'it ends with the clean canonical URL, no query').toBe(true)
    await expect(page.getByRole('link', { name: notifyEmail })).toHaveAttribute('href', /^mailto:/)
  })

  test('a sold work says Sold and asks for another example, never "Ask about this"', async ({
    page,
  }) => {
    const work = await publishedWork()
    const sold = await api.patch(`${BASE_URL}/api/works/${work.id}`, {
      headers: auth(),
      data: { status: 'sold', title: fx.publishedTitle },
    })
    expect(sold.ok(), `PATCH the work sold: ${sold.status()}`).toBeTruthy()
    const itemPath = href('item', { publicId: work.publicId, slug: work.slug }, 'en')
    await page.setViewportSize({ width: 390, height: 844 })
    const res = await page.goto(`${GALLERY_ORIGIN}${itemPath}`, { waitUntil: 'networkidle' })
    expect(res?.status(), itemPath).toBe(200)
    const panel = page.locator('aside[data-status="sold"]')
    await expect(panel.getByText('Sold', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ask about this' })).toHaveCount(0)
    await expect(panel).not.toContainText(/price|available/i)
    const another = panel.getByRole('link', { name: 'Ask for another example' })
    const text = new URL((await another.getAttribute('href')) as string).searchParams.get('text')
    expect(text).toContain(`${stockNumber} — ${fx.publishedTitle} has sold.`)
    expect(text).toContain('Do you have another example?')
  })

  test('a visitor sends the Sell-to-us form (390 px): a lead the owner reads, and an email', async ({
    page,
  }) => {
    const message = 'E2E: I have an 1880s chart of Sumatra to sell.'
    await page.setViewportSize({ width: 390, height: 844 })
    const res = await page.goto(`${GALLERY_ORIGIN}/sell-to-us`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await page.getByLabel('Your name').fill('E2E Seller')
    await page.getByLabel('Email address').fill(sellerEmail)
    await page.getByLabel('What do you have?').fill(message)
    await page.getByLabel(/I agree that Indies Gallery/).check()
    // Turnstile's test site key answers at once with a dummy token in the form's hidden field.
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 20_000,
    })
    const posted = page.waitForResponse((r) => r.url().endsWith('/api/x/leads'))
    await page.getByRole('button', { name: 'Send message' }).click()
    const answer = await posted
    expect(answer.status(), 'the route accepts the visitor’s sell lead').toBe(201)
    expect(await answer.json(), 'no stored field comes back, not even the id').toEqual({ ok: true })
    await expect(page.getByText('We reply the same working day, Singapore time')).toBeVisible()

    // The owner reads the lead: kind, site, source and the visitor's own fields.
    const found = await api.get(
      `${BASE_URL}/api/leads?where[payload.email][equals]=${encodeURIComponent(sellerEmail)}&limit=2&depth=0`,
      { headers: auth() },
    )
    expect(found.ok(), `owner reads the leads: ${found.status()}`).toBeTruthy()
    type Lead = {
      kind: string
      site: string
      source: string
      payload: { email: string; message: string }
    }
    const docs = ((await found.json()) as { docs: Lead[] }).docs
    expect(docs, 'exactly one lead for the one send').toHaveLength(1)
    expect(docs[0]!.kind).toBe('sell')
    expect(docs[0]!.site).toBe('gallery')
    expect(docs[0]!.source).toBe('form')
    expect(docs[0]!.payload.email).toBe(sellerEmail)
    expect(docs[0]!.payload.message).toBe(message)

    // The owner's email about it, in Mailpit. Sending follows the commit, so it is polled for;
    // the assertions after the poll are unconditional. It names the kind and the site only.
    const mail = await mailTo(notifyEmail)
    expect(mail, `the owner's email about the lead in Mailpit`).toBeDefined()
    expect(mail!.Subject, 'the email names the kind').toContain('sell lead')
    expect(mail!.Subject, 'the email names the gallery').toContain('Indies Gallery')
    expect(mail!.Text, 'the email carries no visitor data').not.toContain(sellerEmail)
    expect(mail!.Text, 'the email carries no visitor data').not.toContain(message)
  })

  for (const path of ['/sell-to-us', '/contact']) {
    test(`axe is clean on ${path} at 390 and 1280 px`, async ({ page }) => {
      for (const viewport of WIDTHS) {
        await page.setViewportSize(viewport)
        const res = await page.goto(`${GALLERY_ORIGIN}${path}`, { waitUntil: 'networkidle' })
        expect(res?.status(), `${path} answers`).toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        const { violations } = await new AxeBuilder({ page }).analyze()
        const found = violations.map(
          ({ id, impact, nodes }) =>
            `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
        )
        expect(found, `axe clean: ${path} at ${viewport.width}px`).toEqual([])
      }
    })
  }
})

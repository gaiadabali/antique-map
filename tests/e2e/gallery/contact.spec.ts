/**
 * The gallery's contact surface (TASKS.md 5.3.e; EXPERIENCE-GALLERY.md §8):
 *
 * 1. At 390 px the item page's Ask link is a `wa.me` URL whose decoded text carries the work's
 *    stock number and its title — the §8 handoff, prepared from the lexicon.
 * 2. A valid Sell-to-us post to `/api/x/leads` makes a `leads` row the owner can read, and the
 *    owner's email about it lands in Mailpit. The server runs with Turnstile's always-pass test
 *    key/secret pair (`1x0000000000000000000000000000000AA` both sides), so a post with any
 *    non-empty token is a valid post.
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

test.describe('Gallery contact (5.3.e)', () => {
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
    const id = await publishedWorkId()
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

  /** The published fixture's work record, read by the owner (publicId, slug, id, stockNumber). */
  async function publishedWork(): Promise<{
    id: number
    publicId: number
    slug: string
    stockNumber: string | null
  }> {
    const res = await api.get(
      `${BASE_URL}/api/works?where[title][equals]=${encodeURIComponent(fx.publishedTitle)}&limit=1&depth=0`,
      { headers: auth() },
    )
    expect(res.ok(), `owner reads the published work: ${res.status()}`).toBeTruthy()
    const docs = ((await res.json()) as { docs: Record<string, unknown>[] }).docs
    expect(docs.length, 'the published fixture is found').toBe(1)
    const doc = docs[0] as unknown as {
      id: number
      publicId: number
      slug: string
      stockNumber: string | null
    }
    return doc
  }

  async function publishedWorkId(): Promise<number> {
    return (await publishedWork()).id
  }

  test("the item page's Ask link is a wa.me URL naming the stock number and title (390 px)", async ({
    page,
  }) => {
    const work = await publishedWork()
    expect(work.stockNumber, 'the fixture carries its stock number').toBe(stockNumber)
    const itemPath = href('item', { publicId: work.publicId, slug: work.slug }, 'en')
    await page.setViewportSize({ width: 390, height: 844 })
    // The page answers 200: the shared dev Postgres drops a connection under other worktrees'
    // load, and a failed render answers an error page whose shell still shows a bare wa.me
    // footer link — the Ask link is the one whose `text` parameter carries the prepared message.
    await expect(async () => {
      const res = await page.goto(`${GALLERY_ORIGIN}${itemPath}`, { waitUntil: 'networkidle' })
      expect(res?.status(), itemPath).toBe(200)
      const ask = page.locator('a[href^="https://wa.me/"][href*="?text="]')
      await expect(ask).toHaveCount(1)
      const url = new URL((await ask.getAttribute('href')) as string)
      expect(url.host, 'the handoff is wa.me').toBe('wa.me')
      expect(url.searchParams.get('text'), 'the prepared message names the stock number').toContain(
        stockNumber,
      )
      expect(url.searchParams.get('text'), 'the prepared message names the title').toContain(
        fx.publishedTitle,
      )
    }).toPass({ timeout: 30_000 })
  })

  test('a valid sell-to-us post makes a lead the owner reads and an email in Mailpit', async () => {
    const message = 'E2E: I have an 1880s chart of Sumatra to sell.'
    const res = await api.post(`${BASE_URL}/api/x/leads`, {
      headers: {
        ...HOST_HEADER,
        'content-type': 'application/json',
        'idempotency-key': 'e2e-5-3-sell-1',
      },
      data: {
        kind: 'sell',
        input: {
          name: 'E2E Seller',
          email: sellerEmail,
          message,
          locale: 'en',
          consent: true,
        },
        turnstileToken: 'e2e-token',
      },
    })
    expect(res.status(), 'the route accepts a valid sell lead').toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body), 'the answer carries no stored field, not even the id').toEqual(['ok'])

    // The owner reads the lead: kind, site and the visitor's own fields, nothing else's.
    let lead:
      { kind: string; site: string; payload: { email: string; message: string } } | undefined
    for (let attempt = 0; attempt < 20 && !lead; attempt += 1) {
      const found = await api.get(
        `${BASE_URL}/api/leads?where[payload.email][equals]=${encodeURIComponent(sellerEmail)}&limit=1&depth=0`,
        { headers: auth() },
      )
      expect(found.ok(), `owner reads the leads: ${found.status()}`).toBeTruthy()
      lead = ((await found.json()) as { docs: unknown[] }).docs[0] as typeof lead
      if (!lead) await new Promise((r) => setTimeout(r, 500))
    }
    expect(lead, 'the lead the owner reads').toBeDefined()
    expect(lead!.kind).toBe('sell')
    expect(lead!.site).toBe('gallery')
    expect(lead!.payload.email).toBe(sellerEmail)
    expect(lead!.payload.message).toBe(message)

    // The owner's email about it, in Mailpit (loopback on this worktree). It names the lead's
    // kind and site only — no name, no message, no contact detail ever crosses the mail
    // provider (the lead is owner-only in the admin).
    let mail: { Subject: string; Text: string; To?: { Address?: string }[] } | undefined
    for (let attempt = 0; attempt < 30 && !mail; attempt += 1) {
      const found = await api.get(
        `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${notifyEmail}`)}`,
      )
      if (found.ok()) {
        const messages = ((await found.json()) as { messages?: { ID: string }[] }).messages ?? []
        if (messages[0]) {
          const one = await api.get(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
          if (one.ok()) mail = (await one.json()) as typeof mail
        }
      }
      if (!mail) await new Promise((r) => setTimeout(r, 500))
    }
    expect(mail, `the owner's email about the lead in Mailpit`).toBeDefined()
    expect(mail!.Subject, 'the email names the kind and the site').toContain('sell lead')
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
        if (found.length > 0) console.log(`axe ${path} ${viewport.width}px:`, found)
        expect(found, `axe clean: ${path} at ${viewport.width}px`).toEqual([])
      }
    })
  }
})

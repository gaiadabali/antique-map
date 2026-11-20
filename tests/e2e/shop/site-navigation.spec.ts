/**
 * The shop's pages, menu and footer on the site (TASKS.md 27.5): the header, the dated
 * announcement and the footer come from `shop-header` and `shop-footer`; the legal links open CMS pages; the
 * product page's free-delivery figure comes from the settings; every shop page is the CMS's
 * published page, axe clean and without a horizontal scroll at 390 and 1280, in English and
 * Indonesian; a draft is shown to a signed-in owner in preview and never to the public.
 *
 * The navigation is saved through the admin's own REST API as the owner and put back as it was at
 * the end. Screenshots go to `SITE_SHOTS` when it is set.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { createHref, SITES } from '../../../engine/packages/config/src/sites'
import { ACCOUNTS, PASSWORD } from '../admin/accounts'
import { savedToken, saveTokens } from '../support/sessions'

const PORT = process.env.E2E_PORT ?? '4200'
const API = `http://127.0.0.1:${PORT}`
const HOST = { Host: `shop.localhost:${PORT}` }
const SHOTS = process.env.SITE_SHOTS
const href = createHref(SITES.shop)
const WIDTHS = [390, 1280] as const
const LOCALES = ['en', 'id'] as const

type Json = Record<string, unknown>

/** The owner's session: the run's saved one while the server accepts it (sign-in is rate limited). */
async function ownerToken(request: APIRequestContext): Promise<string> {
  const saved = savedToken(ACCOUNTS.owner.email)
  if (saved) {
    const me = await request.get(`${API}/api/users/me`, {
      headers: { ...HOST, Authorization: `JWT ${saved}` },
    })
    if (me.ok() && ((await me.json()) as { user?: unknown }).user) return saved
  }
  const res = await request.post(`${API}/api/users/login`, {
    headers: HOST,
    data: { email: ACCOUNTS.owner.email, password: PASSWORD },
    timeout: 120_000,
  })
  expect(res.ok(), 'the owner signs in').toBe(true)
  const token = ((await res.json()) as { token: string }).token
  saveTokens({ [ACCOUNTS.owner.email]: token })
  return token
}

const auth = (token: string) => ({ ...HOST, Authorization: `JWT ${token}` })

/** A published shop page at `slug`, made once. */
async function ensurePage(
  request: APIRequestContext,
  token: string,
  slug: string,
  title: string,
): Promise<number> {
  const found = await request.get(
    `${API}/api/pages?where[slug][equals]=${slug}&where[site][equals]=shop&depth=0&draft=true`,
    { headers: auth(token) },
  )
  const doc = ((await found.json()) as { docs: Json[] }).docs[0]
  const data = {
    site: 'shop',
    kind: 'page',
    slug,
    title,
    layout: [{ blockType: 'text', title, body: `${title}: how we look after your order.` }],
    _status: 'published',
  }
  if (doc) {
    if (doc._status !== 'published') {
      await request.patch(`${API}/api/pages/${doc.id}?locale=en`, {
        headers: auth(token),
        data: { _status: 'published' },
      })
    }
    return Number(doc.id)
  }
  const made = await request.post(`${API}/api/pages?locale=en`, { headers: auth(token), data })
  expect(made.ok(), `page ${slug} made`).toBe(true)
  return Number(((await made.json()) as { doc: Json }).doc.id)
}

/** The header's and the footer's globals (split in TASKS.md 27.6), read and saved as one. */
const HEADER = '/api/globals/shop-header'
const FOOTER = '/api/globals/shop-footer'
const HEADER_KEYS = ['announcement', 'mainMenu', 'logo']
const FOOTER_KEYS = ['footerColumns', 'legalLinks', 'copyright', 'galleryLinkLabel']

async function readNav(request: APIRequestContext, token: string, locale: string): Promise<Json> {
  const read = async (route: string) => {
    const res = await request.get(`${API}${route}?depth=0&locale=${locale}`, {
      headers: auth(token),
    })
    expect(res.ok()).toBe(true)
    return (await res.json()) as Json
  }
  return { ...(await read(FOOTER)), ...(await read(HEADER)) }
}

async function saveNav(request: APIRequestContext, token: string, locale: string, data: Json) {
  for (const [route, keys] of [
    [HEADER, HEADER_KEYS],
    [FOOTER, FOOTER_KEYS],
  ] as const) {
    const part = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)))
    if (Object.keys(part).length === 0) continue
    const res = await request.post(`${API}${route}?locale=${locale}`, {
      headers: auth(token),
      data: part,
    })
    expect(res.status(), await res.text()).toBe(200)
  }
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect.soft(overflow, `${page.url()} scrolls sideways`).toBeLessThanOrEqual(0)
}

async function axeClean(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze()
  expect
    .soft(
      result.violations.map((each) => `${each.id}: ${each.nodes.map((n) => n.target).join(' | ')}`),
      page.url(),
    )
    .toEqual([])
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
}

// In order, in one worker (they share the saved navigation), and one failure skips no other.
test.describe.configure({ mode: 'default' })

test.describe('the shop’s pages, menu and footer (27.5)', () => {
  let token = ''
  let privacy = 0
  const before: Record<string, Json> = {}

  test.beforeAll(async ({ request }) => {
    test.setTimeout(180_000)
    token = await ownerToken(request)
    privacy = await ensurePage(request, token, 'privacy', 'Privacy')
    for (const locale of LOCALES) before[locale] = await readNav(request, token, locale)
    const now = Date.now()
    await saveNav(request, token, 'en', {
      announcement: {
        enabled: true,
        text: 'E2E: Nyepi — the shop is closed on 9 March',
        link: { target: 'page', page: privacy },
        startsAt: new Date(now - 3_600_000).toISOString(),
        endsAt: new Date(now + 3_600_000).toISOString(),
      },
      mainMenu: [
        { label: 'Prints', target: 'url', url: href('browse', {}, 'en') },
        { label: 'Our stores', target: 'url', url: href('stores', {}, 'en') },
        { label: 'Privacy', target: 'page', page: privacy },
      ],
      footerColumns: [
        {
          label: 'Help',
          links: [
            { label: 'Privacy', target: 'page', page: privacy },
            {
              label: 'Instagram',
              target: 'url',
              url: 'https://www.instagram.com/oldeastindiesart/',
            },
          ],
        },
      ],
      legalLinks: [{ page: privacy }],
      copyright: '© E2E Old East Indies',
    })
    const saved = await readNav(request, token, 'en')
    await saveNav(request, token, 'id', {
      announcement: { ...(saved.announcement as Json), text: 'E2E: Nyepi — toko tutup 9 Maret' },
      mainMenu: (saved.mainMenu as Json[]).map((row, index) => ({
        ...row,
        label: ['Cetakan', 'Toko kami', 'Privasi'][index],
      })),
      // Localized: an Indonesian line already saved in this database would stand in its place.
      copyright: '© E2E Old East Indies',
    })
    // `settings:shop` expires stale-while-revalidate (`@engine/cache`'s editorial profile): the
    // first request after a save may still be the old page while the new one is made.
    for (const [locale, words] of [
      ['en', 'the shop is closed'],
      ['id', 'toko tutup'],
    ] as const) {
      await expect
        .poll(
          async () =>
            (
              await (
                await request.get(`${API}${href('home', {}, locale)}`, { headers: HOST })
              ).text()
            ).includes(words),
          { timeout: 30_000 },
        )
        .toBe(true)
    }
  })

  test.afterAll(async ({ request }) => {
    // Put the navigation back as it was, English first.
    for (const locale of LOCALES) {
      const { id: _id, globalType: _type, createdAt: _c, updatedAt: _u, ...rest } = before[locale]!
      await saveNav(request, token, locale, rest)
    }
  })

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`header, announcement and footer from the CMS — ${locale} at ${width}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 800 })
        await page.goto(href('home', {}, locale))
        const note = page.getByRole('complementary').first()
        await expect(note).toContainText(locale === 'en' ? 'Nyepi — the shop' : 'toko tutup')
        await expect(note.getByRole('link')).toHaveAttribute(
          'href',
          href('page', { slug: 'privacy' }, locale),
        )
        const menuLabel = locale === 'en' ? 'Our stores' : 'Toko kami'
        if (width >= 1000) {
          await expect(
            page.getByRole('banner').getByRole('link', { name: menuLabel }),
          ).toBeVisible()
        } else {
          await page.getByRole('banner').getByRole('button').first().click()
          await expect(
            page.getByRole('dialog').getByRole('link', { name: menuLabel }),
          ).toBeVisible()
          await page.keyboard.press('Escape')
          // The drawer leaves once its exit has played.
          await expect(page.locator('[role="dialog"]')).toHaveCount(0)
        }
        const footer = page.getByRole('contentinfo')
        await expect(footer.getByRole('heading', { name: 'Help' })).toBeVisible()
        await expect(footer).toContainText('© E2E Old East Indies')
        // Legal links open the CMS page: no placeholder `#` is left.
        expect(await footer.locator('a[href="#"]').count()).toBe(0)
        await expect(footer.getByRole('link', { name: 'Privacy' }).first()).toHaveAttribute(
          'href',
          href('page', { slug: 'privacy' }, locale),
        )
        await noHorizontalScroll(page)
        await axeClean(page)
        await shot(page, `home-nav-${locale}-${width}`)
      })
    }
  }

  test('every shop page is the CMS’s, axe clean, no sideways scroll, at 390 and 1280', async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000)
    const products = await request.get(
      `${API}/api/products?limit=1&depth=0&where[site][equals]=shop`,
      {
        headers: HOST,
      },
    )
    const productSlug = String(((await products.json()) as { docs: Json[] }).docs[0]?.slug ?? '')
    for (const locale of LOCALES) {
      const pages = {
        home: href('home', {}, locale),
        partnership: href('partnership', {}, locale),
        stores: href('stores', {}, locale),
        privacy: href('page', { slug: 'privacy' }, locale),
        ...(productSlug ? { product: href('product', { slug: productSlug }, locale) } : {}),
      }
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 800 })
        for (const [name, path] of Object.entries(pages)) {
          const res = await page.goto(path)
          expect(res?.status(), `${name} ${locale}`).toBe(200)
          await expect(page.locator('h1').first()).toBeVisible()
          await noHorizontalScroll(page)
          await axeClean(page)
          await shot(page, `${name}-${locale}-${width}`)
        }
      }
    }
  })

  test('the product page’s free-delivery figure comes from the settings', async ({
    page,
    request,
  }) => {
    const products = await request.get(
      `${API}/api/products?limit=1&depth=0&where[site][equals]=shop`,
      {
        headers: HOST,
      },
    )
    const slug = String(((await products.json()) as { docs: Json[] }).docs[0]?.slug ?? '')
    test.skip(slug === '', 'no published product')
    const settings = await request.get(`${API}/api/globals/site-settings?depth=0`, {
      headers: auth(token),
    })
    const freeOver = (((await settings.json()) as Json).shop as Json | undefined)?.delivery as
      Json | undefined
    await page.goto(href('product', { slug }, 'en'))
    const line = page.getByText(/Sent from the nearest store/)
    await expect(line).toBeVisible()
    await expect(line).not.toContainText('{freeOver}')
    if (typeof freeOver?.freeOverIdr === 'number') {
      const amount = new Intl.NumberFormat('id-ID').format(freeOver.freeOverIdr)
      await expect(line).toContainText(amount)
    }
  })

  test('a draft shows to the signed-in owner in preview, never to the public', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000)
    const draftTitle = `E2E draft ${Date.now()}`
    await request.patch(`${API}/api/pages/${privacy}?locale=en&draft=true`, {
      headers: auth(token),
      data: { layout: [{ blockType: 'text', title: draftTitle, body: 'Not yet published.' }] },
    })
    const path = href('page', { slug: 'privacy' }, 'en')
    // The public, even holding a forged preview cookie, reads the published page.
    const visitor = await browser.newContext({ baseURL: `http://shop.localhost:${PORT}` })
    const anon = await visitor.newPage()
    const refused = await request.get(`${API}/api/x/preview?path=${encodeURIComponent(path)}`, {
      headers: HOST,
      maxRedirects: 0,
    })
    expect(refused.status()).toBe(403)
    await visitor.addCookies([
      { name: '__prerender_bypass', value: 'forged', domain: 'shop.localhost', path: '/' },
    ])
    await anon.goto(path)
    await expect(anon.getByText(draftTitle)).toHaveCount(0)
    await visitor.close()

    const staff = await browser.newContext({ baseURL: `http://shop.localhost:${PORT}` })
    await staff.addCookies([
      { name: 'payload-token', value: token, domain: 'shop.localhost', path: '/' },
    ])
    const owner = await staff.newPage()
    await owner.goto(`/api/x/preview?path=${encodeURIComponent(path)}`)
    expect(new URL(owner.url()).pathname).toBe(path)
    await expect(owner.getByRole('status')).toContainText('Preview')
    await expect(owner.getByText(draftTitle)).toBeVisible()
    await owner.getByRole('link', { name: 'Leave preview' }).click()
    await expect(owner.getByText(draftTitle)).toHaveCount(0)
    await staff.close()
    // The page as it was, published: the draft is not left behind.
    await request.patch(`${API}/api/pages/${privacy}?locale=en`, {
      headers: auth(token),
      data: {
        layout: [
          { blockType: 'text', title: 'Privacy', body: 'Privacy: how we look after your order.' },
        ],
        _status: 'published',
      },
    })
  })
})

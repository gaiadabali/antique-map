/**
 * The owner's storefront feedback of 2026-11-19 on the site (TASKS.md 28.2), one suite for both
 * apps — today's (`./feedback.spec.ts`) and the shop app (`../shop-app/feedback.spec.ts`), which
 * draw the same `@engine/storefront`. The owner's data is made here through Payload's REST API: the
 * contact, the promise and the pop-up switched on, two articles (a product's picture as the cover, a
 * one-page PDF), a theme and a best seller, a Wall Decor category, two flagship stores and four in
 * Ubud. Then, in English and Indonesian at 390 and 1280 px, axe clean: the contact at the top, in
 * the menu and in the footer; the home's "Shop", its plain picture and its order; the shop page's
 * "Shop by"; the articles opening their PDFs (the media route's sandbox); the two partnership
 * enquiries, no sign-in promoted; the stores by flagship and region; the newsletter pop-up.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { createHref, SITES } from '../../../engine/packages/config/src/sites'
import { axeClean, noOverflow, SHOP_ORIGIN, staffApi, WIDTHS } from '../shop-app/support'

type Json = Record<string, unknown>
const href = createHref(SITES.shop)
const at = (path: string) => `${SHOP_ORIGIN}${path}`
const LOCALES = ['en', 'id'] as const

export const CONTACT = {
  phone: '+62 361 000 111',
  whatsapp: '+6281200001111',
  email: 'hello-e2e@example.test',
}
/** The showroom's address, which the settings once held: no page shows it (the owner, 2026-11-24). */
const SHOWROOM_ADDRESS = /Jl\. Gambuh/
const SEEN = 'oei:newsletter-seen'

/** A one-page PDF, as small as a valid one gets. */
function pdfBytes(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

async function json(answer: Awaited<ReturnType<APIRequestContext['get']>>, what: string) {
  expect(answer.status(), `${what}: ${await answer.text()}`).toBeLessThan(300)
  return (await answer.json()) as Json
}

const docsOf = async (api: APIRequestContext, path: string) =>
  ((await json(await api.get(path), path)).docs as Json[]) ?? []

/** Finds a record by a field, or makes it. */
async function upsert(api: APIRequestContext, collection: string, where: string, data: Json) {
  const [found] = await docsOf(api, `/api/${collection}?depth=0&limit=1&draft=true&${where}`)
  const answer = found
    ? await api.patch(`/api/${collection}/${String(found.id)}?locale=en`, { data })
    : await api.post(`/api/${collection}?locale=en`, { data })
  return (await json(answer, `${collection} saved`)).doc as Json
}

export type FeedbackData = { readonly theme: string; readonly product: string }

/** The owner's data for the feedback's sections, made (or found) through the REST API. */
export async function makeFeedbackData(): Promise<FeedbackData> {
  const api = await staffApi('owner')
  try {
    await json(
      await api.post('/api/globals/site-settings?locale=en', {
        data: {
          shop: { contact: CONTACT, promo: { enabled: true }, newsletter: { enabled: true } },
        },
      }),
      'the settings',
    )
    // A published product with a picture: the best seller, in the theme, its category Wall Decor.
    const products = await docsOf(
      api,
      '/api/products?depth=1&limit=20&where[_status][equals]=published&sort=id',
    )
    const product = products.find((each) => {
      const image = (each.images as { image?: Json }[] | undefined)?.[0]?.image
      return typeof image === 'object' && image !== null && each.category
    })
    expect(product, 'a published product with a picture and a category').toBeTruthy()
    const cover = ((product!.images as { image: Json }[])[0]!.image as Json).id
    const category = (product!.category as Json).id ?? product!.category
    const theme = await upsert(api, 'themes', 'where[slug][equals]=e2e-bali', {
      label: 'E2E Bali',
      slug: 'e2e-bali',
      _status: 'published',
    })
    await json(
      await api.patch(`/api/products/${String(product!.id)}`, {
        data: { bestSeller: true, themes: [theme.id], _status: 'published' },
      }),
      'the best seller',
    )
    await json(
      await api.patch(`/api/categories/${String(category)}`, {
        data: { wallDecor: true, _status: 'published' },
      }),
      'the wall decor category',
    )
    // The PDF, then two articles.
    const [pdf] = await docsOf(api, '/api/media?depth=0&limit=1&where[title][equals]=E2E article')
    const pdfId =
      pdf?.id ??
      (
        (
          await json(
            await api.post('/api/media', {
              multipart: {
                file: { name: 'e2e-article.pdf', mimeType: 'application/pdf', buffer: pdfBytes() },
                _payload: JSON.stringify({ title: 'E2E article', alt: '', subject: 'other' }),
              },
            }),
            'the PDF',
          )
        ).doc as Json
      ).id
    for (const [slug, title, date] of [
      ['e2e-article-one', 'E2E article one', '2026-11-01'],
      ['e2e-article-two', 'E2E article two', '2026-11-10'],
    ] as const) {
      await upsert(api, 'articles', `where[slug][equals]=${slug}`, {
        title,
        slug,
        summary: `${title}, a short summary.`,
        cover,
        pdf: pdfId,
        date,
        _status: 'published',
      })
    }
    // Two flagships, four stores in Ubud (one more than a region shows before "See all").
    const stores = await docsOf(
      api,
      '/api/stores?depth=0&limit=6&sort=id&where[active][equals]=true&where[listed][equals]=true',
    )
    expect(stores.length, 'six listed stores').toBeGreaterThanOrEqual(6)
    for (const [index, store] of stores.entries()) {
      const data = index < 2 ? { flagship: true } : { flagship: false, region: 'ubud' }
      await json(await api.patch(`/api/stores/${String(store.id)}`, { data }), 'a store')
    }
    return { theme: 'E2E Bali', product: String(product!.name) }
  } finally {
    await api.dispose()
  }
}

/** A page with the newsletter pop-up already seen: it never opens over the checks. */
export async function quiet(page: Page): Promise<void> {
  await page.addInitScript((key) => window.localStorage.setItem(key, 'e2e'), SEEN)
}

/**
 * Opens `path` until `ready` holds: the settings and the stores are cached for a little while
 * after the owner saves them (the stores for minutes, with no tag), so the first look may be older.
 */
async function openFresh(page: Page, path: string, ready: () => Promise<void>): Promise<void> {
  await expect(async () => {
    await page.goto(at(path))
    await ready()
  }).toPass({ timeout: 240_000, intervals: [2_000, 5_000, 10_000, 20_000] })
}

const headings = (page: Page) => page.locator('main h2').allInnerTexts()

/** Each of `names` appears among the page's h2s, in this order. */
async function inOrder(page: Page, names: readonly (string | RegExp)[]) {
  const all = await headings(page)
  const positions = names.map((name) =>
    all.findIndex((text) => (typeof name === 'string' ? text.trim() === name : name.test(text))),
  )
  expect(positions, `${page.url()}: ${all.join(' | ')}`).not.toContain(-1)
  expect([...positions].sort((a, b) => a - b)).toEqual(positions)
}

const WORDS = {
  en: {
    shop: 'Shop',
    wall: 'Wall decor',
    articles: 'Our latest articles',
    stores: 'Stores',
    shopBy: ['Best sellers', 'Shop by theme', 'Shop by product type', 'Wall decor'],
    promo: 'Delivery promise',
    contact: 'Contact us',
    flagships: 'Flagship stores',
    drive: 'All reachable within a 30-minute drive.',
    seeAll: /See all in Ubud \(4\)/,
    pdf: /\(PDF, opens in a new tab\)$/,
    retailer: 'Become a Retailer',
    wholesale: 'Customised Wholesale Products',
  },
  id: {
    shop: 'Belanja',
    wall: 'Dekorasi dinding',
    articles: 'Artikel terbaru kami',
    stores: 'Toko',
    shopBy: [
      'Terlaris',
      'Belanja menurut tema',
      'Belanja menurut jenis produk',
      'Dekorasi dinding',
    ],
    promo: 'Janji pengiriman',
    contact: 'Hubungi kami',
    flagships: 'Toko utama',
    drive: 'Semuanya dapat dicapai dalam 30 menit berkendara.',
    seeAll: /Lihat semua di Ubud \(4\)/,
    pdf: /\(PDF, terbuka di tab baru\)$/,
    retailer: 'Menjadi Pengecer',
    wholesale: 'Produk Grosir Khusus',
  },
} as const

/** The suite's tests, for the app the calling spec runs against. */
export function feedbackTests(): void {
  let data: FeedbackData
  test.setTimeout(300_000)
  test.beforeAll(async () => {
    test.setTimeout(180_000)
    data = await makeFeedbackData()
  })

  for (const viewport of WIDTHS) {
    for (const locale of LOCALES) {
      const w = WORDS[locale]
      test(`the landing page — ${locale} at ${viewport.width} px`, async ({ page }) => {
        await quiet(page)
        await page.setViewportSize(viewport)
        // The contact at the top; the promise; the hero's "Shop" to the shop page, its picture plain.
        const bar = page.locator('nav[data-contact="bar"]')
        await openFresh(page, href('home', {}, locale), async () => {
          await expect(bar.getByRole('link', { name: CONTACT.phone })).toBeVisible({
            timeout: 5_000,
          })
          await expect(page.getByRole('heading', { name: w.stores, exact: true })).toBeVisible({
            timeout: 5_000,
          })
        })
        await expect(page.getByRole('region', { name: w.promo })).toBeVisible()
        const hero = page.locator('section[aria-labelledby="home-title"]')
        await expect(hero.getByRole('link', { name: w.shop, exact: true })).toHaveAttribute(
          'href',
          href('browse', {}, locale),
        )
        await expect(hero.locator('a img')).toHaveCount(0)
        // Shop by → Wall Decor → How We Make Them → articles → Partnerships → Stores → Antiques.
        await expect(page.getByRole('heading', { name: w.stores, exact: true })).toBeVisible()
        await inOrder(page, [w.wall, w.articles, w.stores])
        const all = await headings(page)
        const steps = await page.locator('#process h2').innerText()
        expect(all.indexOf(steps)).toBeLessThan(all.indexOf(w.articles))
        expect(all.indexOf(steps)).toBeGreaterThan(all.indexOf(w.wall))
        // The articles: two covers, each opening its PDF in a new tab.
        const articles = page.locator('section[aria-labelledby="home-articles"] a[target="_blank"]')
        await expect(articles).toHaveCount(2)
        await expect(articles.first()).toHaveAccessibleName(w.pdf)
        // The footer's contact: the email, never the address (the owner, 2026-11-24).
        await expect(page.getByRole('contentinfo')).toContainText(CONTACT.email)
        await expect(page.getByRole('contentinfo')).not.toContainText(SHOWROOM_ADDRESS)
        await noOverflow(page, `home ${locale}`)
        await axeClean(page, `home ${locale} ${viewport.width}`)
      })

      test(`the shop page, a theme and the stores — ${locale} at ${viewport.width} px`, async ({
        page,
      }) => {
        await quiet(page)
        await page.setViewportSize(viewport)
        await page.goto(at(href('browse', {}, locale)))
        await expect(page.getByRole('heading', { level: 1, name: w.shop })).toBeVisible()
        await expect(page.getByRole('heading', { name: w.shopBy[1] })).toBeVisible()
        await inOrder(page, w.shopBy)
        await noOverflow(page, `shop ${locale}`)
        await axeClean(page, `shop ${locale} ${viewport.width}`)
        // The theme's card narrows the shop to it.
        await page.getByRole('link', { name: data.theme }).first().click()
        await expect(page).toHaveURL(/[?&]subject=e2e-bali/)
        await expect(page.getByRole('heading', { level: 1, name: data.theme })).toBeVisible()
        await expect(page.getByRole('link', { name: data.product })).toBeVisible()

        const sections = page.locator('main section h2')
        await openFresh(page, href('stores', {}, locale), () =>
          expect(sections.first()).toHaveText(w.flagships, { timeout: 5_000 }),
        )
        const ubud = page.locator('section[aria-labelledby="ubud"]')
        await expect(ubud).toContainText(w.drive)
        const more = ubud.locator('details')
        await expect(more.locator('li')).toHaveCount(1)
        await more.locator('summary', { hasText: w.seeAll }).click()
        await expect(more.locator('li').first()).toBeVisible()
        await noOverflow(page, `stores ${locale}`)
        await axeClean(page, `stores ${locale} ${viewport.width}`)
      })
    }
  }

  test('the menu on a phone carries the contact, without the address or WhatsApp', async ({
    page,
  }) => {
    await quiet(page)
    await page.setViewportSize(WIDTHS[0])
    await page.goto(at(href('stores', {}, 'en')))
    const burger = page.locator('header').getByRole('button', { name: 'Open menu', exact: true })
    const sheet = page.locator('header [role="dialog"]')
    await expect(async () => {
      await burger.click()
      await expect(sheet).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 15_000 })
    const menu = sheet.getByRole('navigation', { name: WORDS.en.contact })
    await expect(menu.getByRole('link', { name: CONTACT.email })).toBeVisible()
    // Neither the address nor WhatsApp in the menu (the owner, 2026-11-24).
    await expect(menu).not.toContainText(SHOWROOM_ADDRESS)
    await expect(menu).not.toContainText('WhatsApp')
  })

  test('the articles page lists every article; each PDF opens, sandboxed', async ({
    page,
    request,
  }) => {
    await quiet(page)
    for (const locale of LOCALES) {
      await page.goto(at(href('page', { slug: 'articles' }, locale)))
      const links = page.locator('main a[target="_blank"]')
      expect(await links.count()).toBeGreaterThanOrEqual(2)
      await expect(links.first()).toHaveAccessibleName(WORDS[locale].pdf)
      await axeClean(page, `articles ${locale}`)
    }
    const pdf = await page.locator('main a[target="_blank"]').first().getAttribute('href')
    expect(pdf).toMatch(/^\/api\/x\/media\/\d+$/)
    const answer = await request.get(at(pdf!))
    expect(answer.status()).toBe(200)
    expect(answer.headers()['content-type']).toBe('application/pdf')
    expect(answer.headers()['content-security-policy']).toBe('sandbox')
  })

  test('the partnership page: two enquiries, no sign-in promoted', async ({ page }) => {
    await quiet(page)
    for (const locale of LOCALES) {
      await page.goto(at(href('partnership', {}, locale)))
      const choice = page.getByRole('radio')
      await expect(choice).toHaveCount(2)
      await expect(page.getByRole('radio', { name: WORDS[locale].retailer })).toBeChecked()
      await page.getByRole('radio', { name: WORDS[locale].wholesale }).check()
      await expect(page.locator('main a[href="#signin"]')).toHaveCount(0)
      await axeClean(page, `partnership ${locale}`)
    }
  })

  test('the newsletter pop-up: once, labelled, Esc closes it', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto(at(href('home', {}, 'en')))
    const dialog = page.getByRole('dialog', { name: 'Join our newsletter' })
    await expect(dialog).toBeVisible({ timeout: 20_000 })
    await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
    await axeClean(page, 'newsletter pop-up')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SEEN)).not.toBeNull()
    await page.reload()
    await page.waitForTimeout(10_000)
    await expect(dialog).toBeHidden()
  })
}

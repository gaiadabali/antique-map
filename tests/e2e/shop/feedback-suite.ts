/**
 * The owner's storefront feedback of 2026-11-19 on the site (TASKS.md 28.2), one suite for both
 * apps — today's (`./feedback.spec.ts`) and the shop app (`../shop-app/feedback.spec.ts`), which
 * draw the same `@engine/storefront`. The owner's data is made through Payload's REST API
 * (`./feedback-data`). Then, in English and Indonesian at 390 and 1280 px, axe clean: the contact
 * at the top, in the menu and in the footer; the home's "Shop", its plain picture and its order; the
 * shop page's "Shop by"; the articles opening their PDFs (the media route's sandbox); the two
 * partnership enquiries, no sign-in promoted; the stores by flagship and region; the newsletter
 * pop-up.
 */
import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { createHref, SITES } from '../../../engine/packages/config/src/sites'
import { axeClean, noOverflow, SHOP_ORIGIN, WIDTHS } from '../shop-app/support'
import { CONTACT, makeFeedbackData, quiet, SEEN, type FeedbackData } from './feedback-data'

const href = createHref(SITES.shop)
const at = (path: string) => `${SHOP_ORIGIN}${path}`
const LOCALES = ['en', 'id'] as const

/** The showroom's address, which the settings once held: no page shows it (the owner, 2026-11-24). */
const SHOWROOM_ADDRESS = /Jl\. Gambuh/

/** The shop's lexicon, the one source its pages render from (the tagline is interim, F1). */
const lexicon = (locale: (typeof LOCALES)[number]): Record<string, string> =>
  JSON.parse(
    readFileSync(`engine/packages/storefront/src/sites/shop/lexicon/${locale}.json`, 'utf8'),
  ) as Record<string, string>

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
    nearby: 'nearby',
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
    nearby: 'terdekat',
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
        // Fresh once the owner's saves show: the contact, the stores, the wall decor and the articles.
        await openFresh(page, href('home', {}, locale), async () => {
          await expect(bar.getByRole('link', { name: CONTACT.phone })).toBeVisible({
            timeout: 5_000,
          })
          for (const name of [w.stores, w.wall, w.articles]) {
            await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({
              timeout: 5_000,
            })
          }
        })
        await expect(page.getByRole('region', { name: w.promo })).toBeVisible()
        const home = lexicon(locale)
        const hero = page.locator('section[aria-labelledby="home-title"]')
        // The tagline: whatever the lexicon holds (interim until the owner gives theirs, F1).
        await expect(hero.getByRole('heading', { level: 1 })).toHaveText(home['home.shop.title']!)
        await expect(hero.getByRole('link', { name: w.shop, exact: true })).toHaveAttribute(
          'href',
          href('browse', {}, locale),
        )
        await expect(hero.locator('a img')).toHaveCount(0)
        // Shop by → Wall Decor → How We Make Them → articles → Partnerships → Stores → Antiques
        // (the owner's order); the sections' own titles read from the lexicon the page renders.
        await inOrder(page, [
          home['home.shop.chipsEyebrow']!,
          w.wall,
          home['home.shop.processTitle']!,
          w.articles,
          home['home.shop.tradeTitle']!,
          w.stores,
          home['home.shop.originalsTitle']!,
        ])
        await expect(page.locator('#process h2')).toHaveText(home['home.shop.processTitle']!)
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
        // Fresh once the best seller and the theme saved for this suite show (cached a while).
        await openFresh(page, href('browse', {}, locale), async () => {
          await expect(page.getByRole('heading', { level: 1, name: w.shop })).toBeVisible({
            timeout: 5_000,
          })
          for (const name of w.shopBy) {
            await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({
              timeout: 5_000,
            })
          }
        })
        // Best sellers → themes → product types → wall decor (the owner's order).
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
        // One store a region (the order of 2026-11-25); Ubud's other three are under Nearby.
        await expect(ubud.locator('li')).toHaveCount(1)
        await expect(page.locator(`section[aria-labelledby="${w.nearby}"] li`)).toHaveCount(3)
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

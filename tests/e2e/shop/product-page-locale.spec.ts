/**
 * The product page's fixed words in the visitor's language (TASKS.md 27.5.c): the delivery line
 * comes from `site-settings.shop.productPage`, which is localized — the Indonesian page shows the
 * Indonesian words (the setting's, or the lexicon's when it is empty), never the English setting by
 * fallback. The two signal lines ("300gsm cotton · archival inks", "Printed in our own workshop")
 * are gone in both languages (the owner's feedback of 2026-11-19, TASKS.md 28.2). At 390 and
 * 1280 px.
 */
import { expect, test } from '@playwright/test'

import { createHref, SITES } from '../../../engine/packages/config/src/sites'

const PORT = process.env.E2E_PORT ?? '4200'
const API = `http://127.0.0.1:${PORT}`
const HOST = { Host: `shop.localhost:${PORT}` }
const href = createHref(SITES.shop)

const WORDS = {
  en: { delivery: /Sent from the nearest store/ },
  id: { delivery: /Dikirim dari toko terdekat/ },
} as const

/** The two signal lines the owner had removed, in both languages. */
const GONE = [
  /300gsm cotton · archival inks/i,
  /Printed in our own workshop/i,
  /Katun 300gsm · tinta arsip/i,
  /Dicetak di workshop kami sendiri/i,
]

for (const width of [390, 1280] as const) {
  test(`the product page's fixed words follow the language — ${width} px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const products = await request.get(
      `${API}/api/products?limit=1&depth=0&where[site][equals]=shop`,
      { headers: HOST },
    )
    const slug = String(((await products.json()) as { docs: { slug?: string }[] }).docs[0]?.slug)
    expect(slug, 'a published shop product').not.toBe('undefined')

    for (const locale of ['id', 'en'] as const) {
      await page.goto(href('product', { slug }, locale))
      const other = WORDS[locale === 'id' ? 'en' : 'id']
      await expect(page.getByText(WORDS[locale].delivery)).toBeVisible()
      await expect(page.getByText(other.delivery)).toHaveCount(0)
      const main = page.locator('main')
      for (const line of GONE) await expect(main.getByText(line)).toHaveCount(0)
    }
  })
}

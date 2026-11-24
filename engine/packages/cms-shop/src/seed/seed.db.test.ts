/**
 * The shop seed's vocabulary on the shop's own database (TASKS.md 24.1): the categories and the
 * settings' defaults load once — Indonesian product-page words beside the English — a second run
 * creates and overwrites nothing, and the database check passes the shop's database. Without
 * `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../db/staff-stack.test-support'
import { PRODUCT_PAGE_COPY } from '../globals/site-settings/shop/product-page'
import { STOREFRONT_COPY } from '../globals/site-settings/shop/storefront'
import { shopDatabaseRefusal } from './guard'
import { seedShopLayer } from './run'
import { categorySeeds } from './vocabulary/categories'
import { SHOP_SETTINGS_DEFAULTS } from './vocabulary/settings'
import { THEME_SEEDS } from './vocabulary/storefront'

type Promo = {
  shop?: { promo?: Record<string, unknown>; newsletter?: { title?: string } }
}
type Settings = {
  shop?: {
    contact?: { whatsapp?: string }
    productPage?: Record<string, string>
  }
}

describe.skipIf(!server)('the shop seed: the vocabulary, on the shop database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_shop_seed_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('is the shop database', async () => {
    expect(await shopDatabaseRefusal(stack.payload)).toBeNull()
  })

  it('seeds the categories and settings once, published, and a second run changes nothing', async () => {
    const { payload } = stack
    const context = invalidationBatch().context()
    const first = await seedShopLayer('vocabulary', { payload, publish: true, context })
    expect(first.vocabulary).toMatchObject({
      categories: { created: categorySeeds().length, present: 0 },
      siteSettings: 'seeded',
      published: { categories: categorySeeds().length, held: [] },
    })
    const second = await seedShopLayer('vocabulary', { payload, publish: true, context })
    expect(second.vocabulary).toMatchObject({
      categories: { created: 0, present: categorySeeds().length },
      siteSettings: 'present',
      published: { categories: 0, held: [] },
    })

    const live = await payload.find({
      collection: 'categories',
      overrideAccess: false,
      depth: 0,
      limit: 100,
      where: { _status: { equals: 'published' } },
    })
    expect(live.totalDocs).toBe(categorySeeds().length)
    const en = (await payload.findGlobal({ slug: 'site-settings', locale: 'en' })) as Settings
    const id = (await payload.findGlobal({ slug: 'site-settings', locale: 'id' })) as Settings
    expect(en.shop?.contact).toMatchObject(SHOP_SETTINGS_DEFAULTS.contact)
    expect(id.shop?.contact).toMatchObject(SHOP_SETTINGS_DEFAULTS.contact)
    expect(en.shop?.productPage?.deliveryLine).toBe(PRODUCT_PAGE_COPY.deliveryLine.en)
    expect(id.shop?.productPage?.deliveryLine).toBe(PRODUCT_PAGE_COPY.deliveryLine.id)
  }, 120_000)

  it('seeds the four themes published and the promotions’ words in both languages, once', async () => {
    const { payload } = stack
    const context = invalidationBatch().context()
    const again = await seedShopLayer('vocabulary', { payload, publish: true, context })
    expect(again.vocabulary?.storefront).toEqual({
      themes: { created: 0, present: THEME_SEEDS.length, published: 0 },
      promotions: 'present',
    })
    const themes = await payload.find({
      collection: 'themes',
      overrideAccess: false,
      depth: 0,
      locale: 'id',
      where: { _status: { equals: 'published' } },
    })
    expect(themes.docs.map((doc) => doc.label).sort()).toEqual([
      'Bali',
      'Botani',
      'Jawa',
      'Singapura',
    ])
    for (const locale of ['en', 'id'] as const) {
      const settings = (await payload.findGlobal({ slug: 'site-settings', locale })) as Promo
      expect(settings.shop?.promo).toMatchObject({
        enabled: true,
        text: STOREFRONT_COPY.promoText[locale],
        condition: STOREFRONT_COPY.promoCondition[locale],
        cutoff: '15:30',
        timeZone: 'Asia/Makassar',
      })
      expect(settings.shop?.newsletter?.title).toBe(STOREFRONT_COPY.newsletterTitle[locale])
    }
    const flagships = await payload.count({
      collection: 'stores',
      where: { flagship: { equals: true } },
    })
    expect(flagships.totalDocs).toBe(0)
  }, 120_000)
})

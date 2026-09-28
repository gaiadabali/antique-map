// Scratch smoke test for C1 and C10 — never committed.
import { describe, expect, it } from 'vitest'

import { createHref, routeMapSchema } from '../src/routes'
import { brandConfigSchema, hasModule, type BrandConfigInput } from '../src/schema'

const en = {
  home: undefined,
  browse: 'browse',
  search: 'search',
  item: 'product',
  design: 'designs',
  maker: 'makers',
  place: 'places',
  collection: 'collections',
  source: 'sources',
  exhibition: 'exhibitions',
  location: 'visit',
  ig: 'ig',
  giftCard: 'gift-cards',
  newsletterArchive: 'newsletter',
  story: 'stories',
  catalogue: 'catalogues',
  cart: 'bag',
  checkout: 'checkout',
  order: 'orders',
  account: 'account',
  pay: 'pay',
  quote: 'quote',
  orderLookup: 'track',
  forms: {
    enquiry: 'enquire',
    offer: 'make-an-offer',
    consignment: 'sell-to-us',
    appointment: 'book-a-visit',
    wholesale: 'trade',
  },
}
const { home: _h, ...enSegments } = en
const idSegments = {
  ...enSegments,
  item: 'produk',
  browse: 'jelajah',
  place: 'tempat',
  search: 'cari',
  forms: { ...enSegments.forms, enquiry: 'tanya' },
}

const config: BrandConfigInput = {
  slug: 'fixture-gallery',
  name: 'Fixture Gallery',
  domains: { production: null, staging: 'gallery.example.test' },
  storefront: 'gallery',
  identity: { contact: { email: 'desk@gallery.example.test', whatsapp: '+6281200000000' } },
  assets: { logo: 'logo.svg', favicon: 'favicon.ico', ogImage: 'og.png' },
  tokens: { '--c-accent': '#8a5a1f' },
  locales: { default: 'en', supported: ['en', 'id'] },
  routes: {
    en: enSegments,
    id: idSegments,
    facets: {
      path: ['objectType', 'place'],
      vocabularies: {
        objectType: {
          en: { map: 'antique-maps', print: 'antique-prints' },
          id: { map: 'peta-antik', print: 'cetakan-antik' },
        },
      },
    },
    legacyPrefixes: ['/category/', '/storage/products/'],
  },
  ids: { workUidPrefix: 'FIX', stockNumberPattern: '^[MPF]\\.[A-Za-z0-9]+$' },
  money: {
    base: 'USD',
    markets: [
      { id: 'id', destinations: ['ID'], currency: 'IDR' },
      { id: 'eu', destinations: ['NL', 'DE'], currency: 'EUR' },
      { id: 'row', destinations: ['*'], currency: 'USD' },
    ],
    rounding: {
      IDR: [
        { upTo: 100000, step: 5000 },
        { upTo: null, step: 50000 },
      ],
      EUR: [{ upTo: null, step: 1000 }],
      USD: [{ upTo: null, step: 1000 }],
    },
    fx: { source: 'ecb-reference', bufferPct: { IDR: '3', EUR: '3.5' } },
  },
  sellers: [
    {
      id: 'sg',
      entity: { name: 'Fixture Atlas Pte. Ltd.', country: 'SG', registration: 'UEN 000' },
      serves: { stockLocations: ['singapore'], destinations: ['*'] },
      tax: { regime: 'SG-GST', registered: false },
      charge: ['USD', 'EUR', 'IDR'],
      payments: ['stripe', 'bank-transfer'],
      methodOrder: ['card', 'paynow', 'bank-transfer'],
      cardCeiling: { amount: 1000000, currency: 'USD' },
      documentPrefix: 'SG',
    },
  ],
  commerce: {
    inventoryModels: ['unique'],
    purchaseTiers: [
      { upTo: 500000, primary: 'buy', secondary: ['enquire', 'whatsapp'] },
      { upTo: null, primary: 'requestPrice', secondary: ['viewing', 'proforma'] },
    ],
  },
  shipping: { providers: ['dhl-express', 'quote', 'collect', 'flat'] },
  fulfilment: { providers: ['own-stock'] },
  analytics: { ga4Id: null, metaPixelId: null },
  modules: { 'catalogue.unique': true, 'purchase.offers': true },
}

describe('C1 brand config', () => {
  it('parses a full config with defaults', () => {
    const parsed = brandConfigSchema.parse(config)
    expect(parsed.commerce.ttl.checkoutLockMinutes).toBe(15)
    expect(parsed.media.publicZoomMaxPx).toBe(4096)
    expect(hasModule(parsed, 'purchase.offers')).toBe(true)
    expect(hasModule(parsed, 'retention.reviews')).toBe(false)
  })
  it('rejects a float amount, a descending ladder and an unknown family', () => {
    const float = structuredClone(config)
    float.sellers[0]!.cardCeiling = { amount: 10.5, currency: 'USD' }
    expect(brandConfigSchema.safeParse(float).success).toBe(false)
    const ladder = structuredClone(config)
    ladder.money.rounding.IDR = [
      { upTo: null, step: 50000 },
      { upTo: 100000, step: 5000 },
    ]
    expect(brandConfigSchema.safeParse(ladder).success).toBe(false)
    const family = structuredClone(config) as unknown as { sellers: { methodOrder: string[] }[] }
    family.sellers[0]!.methodOrder = ['va-bca']
    expect(brandConfigSchema.safeParse(family).success).toBe(false)
  })
  it('C1 fixes from the review', () => {
    const parsed = brandConfigSchema.parse(config)
    expect(parsed.commerce.ttl.checkoutLockMaxHours).toBe(3)
    expect(parsed.commerce.ttl.holdNoticeHours).toBe(12)
    expect(parsed.routes.defaultSort).toEqual({ browse: 'newest', search: 'relevance' })
    const negative = structuredClone(config)
    negative.sellers[0]!.cardCeiling = { amount: -5, currency: 'USD' }
    expect(brandConfigSchema.safeParse(negative).success).toBe(false)
    for (const bad of ['3.555', '-1', '21', '03', 'three']) {
      const buffer = structuredClone(config) as unknown as { money: { fx: { bufferPct: Record<string, string> } } }
      buffer.money.fx.bufferPct.IDR = bad
      expect(brandConfigSchema.safeParse(buffer).success, bad).toBe(false)
    }
    const twoSisters = { ...config, sisters: [
      { slug: 'a', name: 'A', role: 'merch-outlet' as const, baseUrl: 'https://a.example.test' },
      { slug: 'b', name: 'B', role: 'merch-outlet' as const, baseUrl: 'https://b.example.test' },
    ] }
    expect(brandConfigSchema.safeParse(twoSisters).success).toBe(false)
  })
  it('rejects a root segment used twice', () => {
    const clash = { ...config.routes, en: { ...enSegments, search: 'browse' } }
    expect(routeMapSchema.safeParse(clash).success).toBe(false)
  })
})

describe('C10 href()', () => {
  const parsed = brandConfigSchema.parse(config)
  const href = createHref(parsed)
  it('builds localised, deterministic paths', () => {
    expect(href('item', { publicId: 1706, slug: 'bali-island' }, 'en')).toBe('/product/1706-bali-island')
    expect(href('item', { publicId: 1706, slug: 'bali-island' }, 'id')).toBe('/id/produk/1706-bali-island')
    expect(href('home', {}, 'en')).toBe('/')
    expect(href('home', {}, 'id')).toBe('/id')
    expect(
      href('browse', { facets: { objectType: 'map', place: 'java/batavia' } }, 'en'),
    ).toBe('/antique-maps/java/batavia')
    expect(
      href('browse', { facets: { objectType: 'map', technique: ['etching', 'aquatint'] }, page: 2 }, 'id'),
    ).toBe('/id/peta-antik?technique=aquatint&technique=etching&page=2')
    expect(href('search', { q: 'celebes', page: 1 }, 'en')).toBe('/search?q=celebes')
    expect(href('form', { kind: 'offer', item: 1706 }, 'en')).toBe('/make-an-offer?item=1706')
    expect(href('account', { section: 'wantLists' }, 'en')).toBe('/account/want-lists')
    expect(href('order', { number: 'SG-000123' }, 'en')).toBe('/orders/SG-000123')
    expect(href('place', { path: ['java', 'batavia'] }, 'en')).toBe('/places/java/batavia')
    expect(href('pay', { token: 'abc' }, 'id')).toBe('/id/pay/abc')
  })
})

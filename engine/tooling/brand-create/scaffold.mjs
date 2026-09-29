// 2.2.h — `brand:create <slug> --storefront gallery|emporium`: builds a
// `BrandConfigInput` (C1) that stands on its own — no other brand config
// exists yet to clone from (0.6.d / 3.1 have not landed) — with `draft: true`
// (BRANDS.md §7), a brand-specific database/bucket name and a copy folder.
// Every value here is either the caller's input or a fixed, brand-neutral
// default: nothing here is a real brand's data (CONVENTIONS.md §1).
// Every `SEGMENT_SURFACES` row (`@engine/config/routes`) and every `FORM_KINDS`
// key, gated or not — a scaffold gives each a segment so it validates whether
// or not `modules` later switches its module on (`localeSegmentsSchema`
// leaves a gated one optional, never forbidden).
const EN_SEGMENTS = {
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
  partnership: 'partnership',
  wishlist: 'wishlist',
  forms: {
    enquiry: 'enquire',
    offer: 'make-an-offer',
    consignment: 'sell-to-us',
    appointment: 'book-a-visit',
  },
}

/** `{ slug, name, storefront }` → a scaffolded `BrandConfigInput` — draft, one seller, one market, minimal modules. */
export function scaffoldBrandConfig({ slug, name, storefront }) {
  const prefix = slug
    .split('-')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'BR'
  return {
    draft: true,
    slug,
    name,
    domains: { production: null, staging: null },
    storefront,
    identity: { contact: { email: `desk@${slug}.example.test`, whatsapp: '+10000000000' } },
    assets: { logo: 'logo.svg', favicon: 'favicon.ico', ogImage: 'og.png' },
    tokens: {},
    locales: { default: 'en', supported: ['en'] },
    routes: {
      en: EN_SEGMENTS,
      facets: { path: [], vocabularies: {} },
      legacyPrefixes: [],
    },
    ids: { workUidPrefix: prefix, stockNumberPattern: null },
    money: {
      base: 'USD',
      markets: [{ id: 'row', destinations: ['*'], currency: 'USD' }],
      rounding: { USD: [{ upTo: null, step: 1000 }] },
      fx: { source: 'ecb-reference', bufferPct: { USD: '3' } },
    },
    sellers: [
      {
        id: 'main',
        entity: { name: `${name} scaffold entity`, country: 'SG', registration: 'UEN 000' },
        serves: { stockLocations: ['singapore'], destinations: ['*'] },
        tax: { regime: 'SG-GST', registered: false },
        charge: ['USD'],
        payments: ['bank-transfer'],
        methodOrder: ['bank-transfer'],
        cardCeiling: { amount: 1000000, currency: 'USD' },
        documentPrefix: prefix,
      },
    ],
    commerce: {
      inventoryModels: ['unique'],
      purchaseTiers: [{ upTo: null, primary: 'enquire', secondary: [] }],
    },
    shipping: { providers: ['quote'] },
    fulfilment: { providers: ['own-stock'] },
    analytics: { ga4Id: null, metaPixelId: null },
    modules: {},
    sisters: [],
  }
}

/** The database and bucket names `brand:create` assigns a new brand (naming.mjs's own kebab→underscore rule, kept in sync manually since that module is 2.1's). */
export function scaffoldInfraNames(slug) {
  const underscored = slug.replace(/-/g, '_')
  return { database: `${underscored}`, bucket: `${slug}-media` }
}

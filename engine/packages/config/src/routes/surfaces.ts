/**
 * @contract C10 — the route map: surfaces, forms and account sections · owner: ARC · entry: `@engine/config/routes`
 *
 * The tables the route-map schema, `href()` and the proxy's parser share: one row per surface
 * the engine guarantees (DESIGN-SYSTEM.md §2) with its app route, the form kinds and the
 * account sections. A leaf of `./routes.ts`, so nothing here imports the entry.
 */
import { LOCALE_CODES } from '../schema/locales'
import type { ModuleKey } from '../schema/modules'

type SurfaceRoute = {
  /** The app route under `src/app/(site)/[locale]/`; `''` the locale root, `null` no address. */
  internal: string | null
  /** The bare segment is a page too: an index (C2 `DirectoryVM`; for `account`, the overview). */
  index?: true
  /** The module that switches the surface on — its routes 404 when off. Absent: always on. */
  module?: ModuleKey
}

/** Every surface the engine guarantees (DESIGN-SYSTEM.md §2), one row each. */
export const SURFACE_ROUTES = {
  home: { internal: '' },
  browse: { internal: 'browse' },
  search: { internal: 'search' },
  item: { internal: 'item/[idSlug]' },
  design: { internal: 'design/[slug]', module: 'catalogue.productTypes' },
  maker: { internal: 'maker/[slug]', index: true, module: 'content.makers' },
  place: { internal: 'place/[...path]', index: true, module: 'content.gazetteer' },
  collection: { internal: 'collection/[slug]', index: true },
  source: { internal: 'source/[slug]', index: true },
  exhibition: { internal: 'exhibition/[slug]', index: true, module: 'content.exhibitions' },
  location: { internal: 'location/[slug]', index: true },
  ig: { internal: 'ig', module: 'content.linkInBio' },
  giftCard: { internal: 'gift-card', module: 'commerce.giftCards' },
  newsletterArchive: { internal: 'newsletter/[slug]', index: true, module: 'retention.newsletter' },
  story: { internal: 'story/[slug]', index: true, module: 'content.journal' },
  catalogue: { internal: 'catalogue/[slug]', index: true, module: 'content.catalogues' },
  page: { internal: 'page/[slug]' },
  cart: { internal: 'cart' },
  checkout: { internal: 'checkout' },
  // The customer session or a `lookupToken` (C6 `OrderAccess`), never the order number alone.
  order: { internal: 'order/[number]' },
  account: { internal: 'account/[section]', index: true },
  form: { internal: 'form/[kind]' },
  pay: { internal: 'pay/[token]' },
  quote: { internal: 'quote/[token]', module: 'purchase.invoices' },
  orderLookup: { internal: 'order-lookup' },
  notFound: { internal: null },
  gone: { internal: null },
  error: { internal: null },
} as const satisfies Record<string, SurfaceRoute>
export type Surface = keyof typeof SURFACE_ROUTES
export const SURFACES = Object.keys(SURFACE_ROUTES) as [Surface, ...Surface[]]

/** Surfaces with an address, i.e. everything `href()` can build. */
export type LinkSurface = Exclude<Surface, 'notFound' | 'gone' | 'error'>
/** Surfaces at one localised first segment: all but the root, CMS pages and forms. */
export type SegmentSurface = Exclude<LinkSurface, 'home' | 'page' | 'form'>
const NOT_SEGMENT: readonly Surface[] = ['home', 'page', 'form', 'notFound', 'gone', 'error']
const isSegmentSurface = (s: Surface): s is SegmentSurface => !NOT_SEGMENT.includes(s)
export const SEGMENT_SURFACES = SURFACES.filter(isSegmentSurface)

/** The `Form` surface's kinds, each at its own localised segment. */
export const FORM_KINDS = {
  enquiry: {},
  offer: { module: 'purchase.offers' },
  consignment: { module: 'services.consignment' },
  appointment: { module: 'services.appointments' },
  wholesale: { module: 'services.wholesale' },
} as const satisfies Record<string, { module?: ModuleKey }>
export type FormKind = keyof typeof FORM_KINDS

/**
 * Account sections (DESIGN-SYSTEM.md §2 `Account`). Their segments are not localised:
 * the pages are private and never shared, so a translated URL buys nothing.
 */
export const ACCOUNT_SECTIONS = {
  overview: { segment: null },
  orders: { segment: 'orders' },
  wishlist: { segment: 'wishlist', module: 'retention.wishlist' },
  wantLists: { segment: 'want-lists', module: 'retention.wantList' },
  addresses: { segment: 'addresses' },
  profile: { segment: 'profile' },
  privacy: { segment: 'privacy' },
  offers: { segment: 'offers', module: 'purchase.offers' },
  holds: { segment: 'holds', module: 'purchase.holds' },
  priceRequests: { segment: 'price-requests', module: 'purchase.requestPrice' },
  viewings: { segment: 'viewings', module: 'services.appointments' },
  consignments: { segment: 'consignments', module: 'services.consignment' },
} as const satisfies Record<string, { segment: string | null; module?: ModuleKey }>
export type AccountSection = keyof typeof ACCOUNT_SECTIONS

/** Root segments that are never a surface, a form, a named facet or a CMS page. */
export const RESERVED_SEGMENTS = [...LOCALE_CODES, 'api', 'admin', 'brand-assets', 'style-guide']

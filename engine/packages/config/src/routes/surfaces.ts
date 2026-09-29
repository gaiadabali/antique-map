/**
 * @contract C10 — the route map: surfaces, forms and account sections · owner: ARC · entry: `@engine/config/routes`
 *
 * The tables the route-map schema, `href()` and the proxy's parser share: one row per surface
 * the engine guarantees (DESIGN-SYSTEM.md §2) with its app route, the form kinds and the
 * account sections. A leaf of `./routes.ts`, so nothing here imports the entry.
 */
import { LOCALE_CODES } from '../constants'
import { hasModule, type ModuleFlags, type ModuleKey } from '../schema/modules'

type SurfaceRoute = {
  /** The app route under `src/app/(site)/[locale]/`; `''` the locale root, `null` no address. */
  internal: string | null
  /** The bare segment is a page too: an index (C2 `DirectoryVM`; for `account`, the overview). */
  index?: true
  /** The module that switches the surface on — its routes 404 when off. Absent: always on. */
  module?: ModuleKey
  /**
   * Modules any one of which switches the surface on, for a surface two capabilities share —
   * its routes 404 while every one is off (`hasSurface()`). Its segment is required either way.
   */
  anyModule?: readonly [ModuleKey, ModuleKey, ...ModuleKey[]]
  /**
   * The URL names something private — an order, a payment link, a quote. The proxy answers it
   * with `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`, so no path or token leaks
   * to a script or a link the page loads once analytics consent is given.
   */
  sensitive?: true
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
  // The session or the order-access cookie (C13 `ORDER_ACCESS`), never the number alone.
  order: { internal: 'order/[number]', sensitive: true },
  // Every signed-in customer's area — a buyer's, or an approved partner's (D31) — so on while
  // either may hold an account, and on no brand where no one can (3.4.f).
  account: {
    internal: 'account/[section]',
    index: true,
    anyModule: ['accounts.buyers', 'accounts.retailers'],
  },
  form: { internal: 'form/[kind]' },
  pay: { internal: 'pay/[token]', sensitive: true },
  quote: { internal: 'quote/[token]', module: 'purchase.invoices', sensitive: true },
  orderLookup: { internal: 'order-lookup' },
  // The partner programme and its sign-up/sign-in (D31, D36): every business buyer applies here.
  partnership: { internal: 'partnership', module: 'accounts.retailers' },
  // A guest's saved items, kept on the device (D35): the shop's wishlist, with no account.
  wishlist: { internal: 'wishlist', module: 'retention.deviceWishlist' },
  // Where every want-list alert link leads, to save the subject its query names, and where an
  // address's emails land (C13 `WANT_LIST_ACCESS`) to confirm or stop its list (D39).
  wantList: { internal: 'want-list', module: 'retention.emailWantList' },
  notFound: { internal: null },
  gone: { internal: null },
  error: { internal: null },
} as const satisfies Record<string, SurfaceRoute>
export type Surface = keyof typeof SURFACE_ROUTES
export const SURFACES = Object.keys(SURFACE_ROUTES) as [Surface, ...Surface[]]

/**
 * Whether a brand has a surface: one always on, one whose `module` is on, or one any of whose
 * `anyModule` is on. What the proxy asks before it rewrites to a surface — a closed one is
 * not found (C13) — and a loader or a menu before it links there.
 */
export function hasSurface(config: { readonly modules: ModuleFlags }, surface: Surface): boolean {
  const modules = surfaceModules(surface)
  return modules.length === 0 || modules.some((key) => hasModule(config, key))
}

/** The modules any one of which switches a surface on; `[]` for one that is always on. */
export function surfaceModules(surface: Surface): readonly ModuleKey[] {
  const row: SurfaceRoute = SURFACE_ROUTES[surface]
  return row.module !== undefined ? [row.module] : (row.anyModule ?? [])
}

/** Surfaces with an address, i.e. everything `href()` can build. */
export type LinkSurface = Exclude<Surface, 'notFound' | 'gone' | 'error'>
/** Surfaces at one localised first segment: all but the root, CMS pages and forms. */
export type SegmentSurface = Exclude<LinkSurface, 'home' | 'page' | 'form'>
const NOT_SEGMENT: readonly Surface[] = ['home', 'page', 'form', 'notFound', 'gone', 'error']
const isSegmentSurface = (s: Surface): s is SegmentSurface => !NOT_SEGMENT.includes(s)
export const SEGMENT_SURFACES = SURFACES.filter(isSegmentSurface)

/**
 * The `Form` surface's kinds, each at its own localised segment, and the C6 operation each posts:
 * `enquiry.submit`, `offer.submit`, `consignment.submit`, `appointment.book` — or, given an
 * `appointment` the session owns, `appointment.change` to reschedule it; `hold` —
 * `hold.request`, for an item; `quote` — `quote.request`, for an item (a configured `variant` of
 * it) or as a brief, from a guest where `accounts.retailers` is off and only from a signed-in
 * partner where it is on (D36). A proforma is the checkout's, not a form (C6 `quote.proforma`).
 */
export const FORM_KINDS = {
  enquiry: {},
  offer: { module: 'purchase.offers' },
  consignment: { module: 'services.consignment' },
  appointment: { module: 'services.appointments' },
  hold: { module: 'purchase.holds' },
  quote: { module: 'purchase.invoices' },
} as const satisfies Record<string, { module?: ModuleKey }>
export type FormKind = keyof typeof FORM_KINDS

/**
 * Account sections (DESIGN-SYSTEM.md §2 `Account`). Their segments are not localised:
 * the pages are private and never shared, so a translated URL buys nothing. `setPassword`
 * and `reset` are reached signed out: the page an emailed password link lands on (C13
 * `PASSWORD_LINK`), and the request for one.
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
  quotes: { segment: 'quotes', module: 'accounts.retailers' },
  terms: { segment: 'terms', module: 'accounts.retailers' },
  setPassword: { segment: 'set-password' },
  reset: { segment: 'reset' },
} as const satisfies Record<string, { segment: string | null; module?: ModuleKey }>
export type AccountSection = keyof typeof ACCOUNT_SECTIONS

/** Root segments that are never a surface, a form, a named facet or a CMS page. */
export const RESERVED_SEGMENTS = [...LOCALE_CODES, 'api', 'admin', 'brand-assets', 'style-guide']

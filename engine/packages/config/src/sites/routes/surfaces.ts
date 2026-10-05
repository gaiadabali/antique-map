/**
 * The surfaces a public URL can name (ARCHITECTURE.md §5), one row each, with the internal route
 * the proxy rewrites it to under the site's tree (`app/(<site>)/<site>/[locale]/<internal>`).
 *
 * Which surfaces a site has is which segments its route map holds (`./types`): the gallery has no
 * bag, the shop no makers. A surface missing from a site's map is no page there — `href()` throws
 * for it and `parsePublicPath()` never matches it — so nothing else switches a page on or off.
 * A leaf: it imports only the zod-free constants.
 */
import { LOCALE_CODES } from '../../constants'

type SurfaceRoute = {
  /** The app route under the site's `[locale]`; `''` the locale root, `null` no address. */
  readonly internal: string | null
  /** The bare segment is a page too: an index (the makers' list, the find-my-order page). */
  readonly index?: true
  /**
   * The URL names something private — an order's tracking token. The proxy answers it with
   * `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`, so no token leaks to a link the
   * page loads or to a search engine.
   */
  readonly sensitive?: true
}

export const SURFACE_ROUTES = {
  home: { internal: '' },
  browse: { internal: 'browse' },
  search: { internal: 'search' },
  /** The gallery's work: `/product/{publicId}-{slug}`, resolved by its public id. */
  item: { internal: 'item/[idSlug]' },
  /** The shop's product: `/product/{slug}`, resolved by its slug. */
  product: { internal: 'product/[slug]' },
  maker: { internal: 'maker/[slug]', index: true },
  place: { internal: 'place/[...path]', index: true },
  story: { internal: 'story/[slug]', index: true },
  collection: { internal: 'collection/[slug]', index: true },
  cart: { internal: 'cart' },
  checkout: { internal: 'checkout' },
  /** `/track` finds an order; `/track/{token}` is its tracking page, the token its credential. */
  tracking: { internal: 'track/[token]', index: true, sensitive: true },
  /** `/order/{token}` is the order page after checkout; its `/simulate` child the pay simulator. */
  order: { internal: 'order/[token]', sensitive: true },
  partnership: { internal: 'partnership' },
  stores: { internal: 'stores' },
  sellToUs: { internal: 'sell-to-us' },
  /** A CMS page at its own slug, `/{slug}`. */
  page: { internal: 'page/[slug]' },
  notFound: { internal: null },
  gone: { internal: null },
  error: { internal: null },
} as const satisfies Record<string, SurfaceRoute>

export type Surface = keyof typeof SURFACE_ROUTES
export const SURFACES = Object.keys(SURFACE_ROUTES) as [Surface, ...Surface[]]

/** Surfaces with an address, i.e. everything `href()` can build. */
export type LinkSurface = Exclude<Surface, 'notFound' | 'gone' | 'error'>
/** Surfaces at one localised first segment: all but the root and CMS pages. */
export type SegmentSurface = Exclude<LinkSurface, 'home' | 'page'>
const NOT_SEGMENT: readonly Surface[] = ['home', 'page', 'notFound', 'gone', 'error']
const isSegmentSurface = (s: Surface): s is SegmentSurface => !NOT_SEGMENT.includes(s)
export const SEGMENT_SURFACES = SURFACES.filter(isSegmentSurface)

export function isSensitive(surface: Surface): boolean {
  const row: SurfaceRoute = SURFACE_ROUTES[surface]
  return row.sensitive === true
}

export function hasIndex(surface: Surface): boolean {
  const row: SurfaceRoute = SURFACE_ROUTES[surface]
  return row.index === true
}

/**
 * Root segments that are never a surface, a named facet or a CMS page: a locale prefix, and the
 * two the proxy answers before it reads the route map — Payload's `/api` and `/admin`.
 */
export const RESERVED_SEGMENTS: readonly string[] = [...LOCALE_CODES, 'api', 'admin']

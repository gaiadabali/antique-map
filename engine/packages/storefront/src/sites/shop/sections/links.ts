/**
 * The shop page's views (TASKS.md 28.2; the UI/UX revision of 2026-11-25, a left panel "like
 * Tokopedia"): the shop at its own address, narrowed or switched by one of the listing facets the
 * URL contract already carries (`@engine/config` `FACET_KEYS`, which the proxy keeps): a theme as
 * `subject` (`?subject=bali` — what a print shows), and a view as `productType`
 * (`?productType=themes`, `product-types`, `wall-decor`, `all`, and `best-sellers`, which is also
 * the shop's own address). The page (`pages/browse`) reads them back with `shopFilterOf()`.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

/** The panel's views in the owner's order (the feedback of 2026-11-19): the first is the default. */
export const SHOP_VIEWS = ['best-sellers', 'themes', 'product-types', 'wall-decor', 'all'] as const
export type ShopView = (typeof SHOP_VIEWS)[number]

export const SHOP_SETS = SHOP_VIEWS
export type ShopSet = ShopView

export type ShopFilter =
  | { readonly kind: 'theme'; readonly slug: string }
  | { readonly kind: 'set'; readonly set: ShopSet }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The facet a filter is carried in, as the listing's state takes it. */
export function filterFacets(filter: ShopFilter): { subject: string } | { productType: string } {
  return filter.kind === 'theme' ? { subject: filter.slug } : { productType: filter.set }
}

/** The shop listing narrowed by `filter`, at its one canonical address. */
export function shopFilterHref(filter: ShopFilter, locale: SiteLocale): string {
  return createHref(SITES.shop)('browse', { facets: filterFacets(filter) }, locale)
}

const firstOf = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

/** The filter a shop URL's query names, or `null` for the whole shop (or a malformed value). */
export function shopFilterOf(
  query: Readonly<Record<string, string | string[] | undefined>>,
): ShopFilter | null {
  const theme = firstOf(query.subject)
  if (theme !== undefined) return SLUG.test(theme) ? { kind: 'theme', slug: theme } : null
  const set = SHOP_SETS.find((each) => each === firstOf(query.productType))
  return set === undefined ? null : { kind: 'set', set }
}

/** The view a filter shows: a theme's prints under the themes; no filter, the best sellers. */
export function viewOf(filter: ShopFilter | null | undefined): ShopView {
  if (filter === null || filter === undefined) return 'best-sellers'
  return filter.kind === 'theme' ? 'themes' : filter.set
}

/** A view's one address: the best sellers at the shop's own, every other as its set. */
export function shopViewHref(view: ShopView, locale: SiteLocale): string {
  return view === 'best-sellers'
    ? createHref(SITES.shop)('browse', {}, locale)
    : shopFilterHref({ kind: 'set', set: view }, locale)
}

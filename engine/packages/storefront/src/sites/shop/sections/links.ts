/**
 * The shop page's narrowed views (TASKS.md 28.2): the shop listing at its own address narrowed by
 * one of the listing facets the URL contract already carries (`@engine/config` `FACET_KEYS`, which
 * the proxy keeps): a theme as `subject` (`?subject=bali` — what a print shows), and a set as
 * `productType` (`?productType=best-sellers`, `?productType=wall-decor`). The page
 * (`pages/browse`) reads them back with `shopFilterOf()`; anything else is the whole shop.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

export const SHOP_SETS = ['best-sellers', 'wall-decor'] as const
export type ShopSet = (typeof SHOP_SETS)[number]

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

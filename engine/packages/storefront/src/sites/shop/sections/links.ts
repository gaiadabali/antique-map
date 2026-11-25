/**
 * The shop page's addresses (TASKS.md 28.2; the UI/UX revision of 2026-11-25, a left panel "like
 * Tokopedia"). The shop page shows every section in the owner's order, and its left panel follows
 * them (`SHOP_SECTIONS`, each at `/shop#<anchor>`). A section's "See all" — and a theme's prints —
 * is the shop listing narrowed by one of the listing facets the URL contract already carries
 * (`@engine/config` `FACET_KEYS`, which the proxy keeps): a theme as `subject` (`?subject=bali` —
 * what a print shows), and a set as `productType` (`?productType=best-sellers`,
 * `?productType=wall-decor`). The page (`pages/browse`) reads them back with `shopFilterOf()`;
 * anything else is the shop page itself.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

export const SHOP_SETS = ['best-sellers', 'wall-decor'] as const
export type ShopSet = (typeof SHOP_SETS)[number]

/** The shop page's sections in the owner's order (the feedback of 2026-11-19), Shop all last. */
export const SHOP_SECTIONS = [
  'best-sellers',
  'themes',
  'product-types',
  'wall-decor',
  'all',
] as const
export type ShopSection = (typeof SHOP_SECTIONS)[number]

/** Each section's anchor on the shop page. */
export const SECTION_ANCHORS: Readonly<Record<ShopSection, string>> = {
  'best-sellers': 'best-sellers',
  themes: 'themes',
  'product-types': 'product-types',
  'wall-decor': 'wall-decor',
  all: 'shop-all',
}

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

/** The section a narrowed page belongs under: a set's own, a theme's prints under the themes. */
export function sectionOf(filter: ShopFilter): ShopSection {
  return filter.kind === 'theme' ? 'themes' : filter.set
}

/** A section on the shop page, from another page (`/shop#themes`). */
export function shopSectionHref(section: ShopSection, locale: SiteLocale): string {
  return `${createHref(SITES.shop)('browse', {}, locale)}#${SECTION_ANCHORS[section]}`
}

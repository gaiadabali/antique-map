/**
 * Every link on the browse and search pages (5.1.b): `href()` of a facet state, through
 * `listingOfState()` (`server/gallery/catalogue/url-state`), so the route map decides which facets
 * become path segments (`/antique-maps/java`, `/id/peta-antik/java`) and one state has one
 * address. Pure: the components and the tests build links the same way.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import {
  dateValuesOf,
  facetsOfState,
  listingOfState,
} from '../../../server/gallery/catalogue/url-state'

const href = createHref(SITES.gallery)

/** A state's canonical browse address. */
export function browseHref(
  state: FacetState,
  places: readonly PlaceNode[],
  locale: SiteLocale,
): string {
  return href('browse', listingOfState(state, places), locale)
}

/** The browse page's own address, no filter: what a GET form posts to. */
export function browseBase(locale: SiteLocale): string {
  return href('browse', {}, locale)
}

/** A search's address: the words, and the sold archive when the visitor asked for it. */
export function searchHref(query: string, includeSold: boolean, locale: SiteLocale): string {
  return href(
    'search',
    { q: query, ...(includeSold ? { facets: { availability: 'sold' } } : {}) },
    locale,
  )
}

/** The search page's own address, no words: what its form posts to. */
export function searchBase(locale: SiteLocale): string {
  return href('search', { q: '' }, locale)
}

/** The item a card opens, by its public id (5.2 owns the page; its route redirects to the slug). */
export function itemHref(publicId: number, locale: SiteLocale): string {
  return href('item', { publicId, slug: '' }, locale)
}

/** A state's filters as the beacon's `listing.viewed` `facets[]` pairs — ids and codes, ≤ 50. */
export function beaconFacetsOf(state: FacetState): readonly { key: string; value: string }[] {
  const pairs = (key: string, values: readonly (string | number)[]) =>
    values.map((value) => ({ key, value: String(value) }))
  return [
    ...pairs('objectType', state.objectType),
    ...pairs('place', state.place === null ? [] : [state.place]),
    ...pairs('maker', state.maker),
    ...pairs('date', dateValuesOf(state)),
    ...pairs('subject', state.subject),
    ...pairs('availability', state.includeSold ? ['sold'] : []),
  ].slice(0, 50)
}

/** The filters a GET form must carry as hidden inputs — a form drops its action's query — every
 * facet but the date (the form's own), and the sort. */
export function hiddenInputsOf(
  state: FacetState,
  places: readonly PlaceNode[],
): readonly (readonly [string, string])[] {
  const { date: _date, ...facets } = facetsOfState(state, places)
  const hidden: (readonly [string, string])[] = Object.entries(facets).flatMap(([key, values]) =>
    (values ?? []).map((value) => [key, value] as const),
  )
  if (state.sort !== SITES.gallery.routes.defaultSort.browse) hidden.push(['sort', state.sort])
  return hidden
}

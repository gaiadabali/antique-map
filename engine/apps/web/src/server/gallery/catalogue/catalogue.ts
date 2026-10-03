/**
 * The gallery catalogue's cached reads (5.1): the listing, the facets and the search, under
 * `'use cache'` and tagged `works`, so one invalidation reaches every page that lists or finds a
 * work (the hook `work-invalidate` revalidates the record tags; the listing's own tag is the
 * collection's). The cache key carries the state and the locale as arguments (ARCHITECTURE.md
 * §6); nothing here reads a request.
 *
 * The search stays one function behind a small interface (`./search`), importable without a
 * React tree, for the chat's `search_catalogue` tool later.
 */
import 'server-only'

import { cacheTag } from 'next/cache'
import type { Payload } from 'payload'

import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import type { FilterContext } from './db'
import { facetsOf } from './facets'
import { listWorks } from './listing'
import { loadPlaces, descendantIdsOf, type PlaceNode } from './places'
import { projectCards } from './projection'
import { searchWorkIds } from './search'
import { EMPTY_STATE, type FacetState } from './state'
import type { FacetSetVM, SearchResultVM, WorkListingVM } from './view-models'

/** The whole works collection's tag: an editorial change re-renders every listing that shows one. */
const WORKS_TAG = 'works'

function tagWorks(): void {
  cacheTag(WORKS_TAG)
}

/** The date a card shows when a work's date was left unknown, said on purpose. */
const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

/** The published gazetteer as the filters' place resolver: a place selects it and its own. */
async function contextOf(payload: Payload): Promise<FilterContext> {
  const places: readonly PlaceNode[] = await loadPlaces(payload, 'en')
  const ids = new Map(places.map((place) => [place.id, descendantIdsOf(places, place.id)]))
  return { placeIds: (placeId) => ids.get(placeId) ?? [placeId] }
}

/** The published gazetteer as the browse pages resolve place paths and name places, in one
 * locale: cached under the works tag, so a gazetteer edit re-renders the pages that name one. */
export async function placeTree(locale: SiteLocale): Promise<readonly PlaceNode[]> {
  'use cache'
  tagWorks()
  const payload = await cms()
  return loadPlaces(payload, locale)
}

/** One page of the browse listing, for one facet state. */
export async function listing(state: FacetState, locale: SiteLocale): Promise<WorkListingVM> {
  'use cache'
  tagWorks()
  const payload = await cms()
  return listWorks(payload, state, await contextOf(payload), locale, UNKNOWN_DATE[locale])
}

/** The six facets, with their all-but-own counts, for one facet state. */
export async function facets(state: FacetState, locale: SiteLocale): Promise<FacetSetVM> {
  'use cache'
  tagWorks()
  const payload = await cms()
  return facetsOf(payload, state, await contextOf(payload), locale)
}

/** The facets of an empty state: what a page shows before anything filters. */
export async function allFacets(locale: SiteLocale): Promise<FacetSetVM> {
  return facets(EMPTY_STATE, locale)
}

/** One search answer: the words, matched by `./search`, projected as listing cards. */
export async function search(options: {
  query: string
  locale: SiteLocale
  includeSold: boolean
}): Promise<SearchResultVM> {
  'use cache'
  tagWorks()
  const payload = await cms()
  const answer = await searchWorkIds(payload, options)
  const items = await projectCards(
    payload,
    answer.ids,
    options.locale,
    UNKNOWN_DATE[options.locale],
  )
  return { items, total: answer.ids.length, suggestion: answer.suggestion, jumpTo: answer.jumpTo }
}

export { EMPTY_STATE }
export type { FacetState }

/**
 * The gallery catalogue's cached reads (5.1): the listing, the facets, the place tree and the
 * search, under `'use cache'` and tagged `catalogue:gallery` (`@engine/cache`'s `catalogueTag`),
 * so one invalidation reaches every page that lists or finds a work. A listing shows records no
 * record tag can name — the work published a moment ago is on no cached listing yet — so the
 * site's catalogue tag is the one these carry, and every write that could change a listing expires
 * it: a published work's save, publish, unpublish or delete (`@engine/cms` `work-invalidate`), and
 * any edit of a place, maker or term (`vocabulary-invalidate`). The cache key carries the state and
 * the locale as arguments (ARCHITECTURE.md §6); nothing here reads a request.
 *
 * **Lifetime.** Each scope declares `cacheLife('hours')` (revalidate 1 h, expire 1 day): the tag
 * is the freshness, the lifetime only a backstop for a write that announced nothing — a CLI run
 * with no site to post its tags to (`import/cli-cache`), a fix in SQL. Left implicit it was the
 * `default` profile, which kept a listing 15 minutes stale when nothing expired it (5.1.d's e2e).
 *
 * The search stays one function behind a small interface (`./search`), importable without a
 * React tree, for the chat's `search_catalogue` tool later.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
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

/** The gallery's listings' tag: a change any listing could show re-renders every one. */
const CATALOGUE = catalogueTag('gallery')

/** The date a card shows when a work's date was left unknown, said on purpose. */
const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

/** The published gazetteer as the filters' place resolver: a place selects it and its own. The
 * tree is the cached one (`placeTree`), so a cold listing does not read it again. */
async function contextOf(): Promise<FilterContext> {
  const places: readonly PlaceNode[] = await placeTree('en')
  const ids = new Map(places.map((place) => [place.id, descendantIdsOf(places, place.id)]))
  return { placeIds: (placeId) => ids.get(placeId) ?? [placeId] }
}

/** The published gazetteer as the browse pages resolve place paths and name places, in one
 * locale: cached under the catalogue tag, so a gazetteer edit re-renders the pages that name one. */
export async function placeTree(locale: SiteLocale): Promise<readonly PlaceNode[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  return loadPlaces(payload, locale)
}

/** One page of the browse listing, for one facet state. */
export async function listing(state: FacetState, locale: SiteLocale): Promise<WorkListingVM> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  return listWorks(payload, state, await contextOf(), locale, UNKNOWN_DATE[locale])
}

/** The six facets, with their all-but-own counts, for one facet state. */
export async function facets(state: FacetState, locale: SiteLocale): Promise<FacetSetVM> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  return facetsOf(payload, state, await contextOf(), locale)
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
  cacheLife('hours')
  cacheTags([CATALOGUE])
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

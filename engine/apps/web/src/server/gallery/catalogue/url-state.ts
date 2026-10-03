/**
 * The listing URL and the facet state, in both directions (5.1.b). The proxy rewrites a browse or
 * search URL to its page with the canonical listing query alone (`parsePublicPath()`), so a page
 * reads `parseListingQuery()` and hands the result here; every link the page draws is `href()` of
 * `listingOfState()`. The contract's facet keys are the only vocabulary — a parameter the route
 * map does not know never reaches the page — so:
 *
 * - `availability=sold` is the "Include sold" toggle (the default query is available + on hold);
 * - `place` is the gazetteer path (`java/batavia`), resolved against the published tree; a path
 *   that names no place is no address, and the page answers 404;
 * - `date` carries a century chip (`18`) and the from–to pair as one value (`1700-1800`,
 *   `1700-`, `-1800`). A form without JavaScript sends its two year inputs as two bare years
 *   (`date=1700&date=1800`): two read as the pair, one as its start.
 *
 * Values the URL invents — an unknown type, a non-id maker, a year out of range — are dropped,
 * never guessed. Pure: no database, no request; importable by a component.
 */
import type { ListingQuery, ListingState } from '@engine/config/sites'
import { OBJECT_TYPES, type FacetKey } from '@engine/config/schema'

import { ancestorsOf, placeIdOfPath, type PlaceNode } from './places'
import { EMPTY_STATE, PERIOD_CHIPS, WORK_SORTS, type FacetState, type WorkSort } from './state'

const MAX_PAGE = 200
const MAX_IDS = 40
const MIN_YEAR = 1
const MAX_YEAR = 2100

const valuesOf = (value: string | readonly string[] | undefined): readonly string[] =>
  [value ?? []].flat()

const idsOf = (values: readonly string[]): readonly number[] =>
  values
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, MAX_IDS)

const yearOf = (text: string | undefined): number | null => {
  if (text === undefined || text === '') return null
  const year = Number(text)
  return Number.isSafeInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null
}

const RANGE = /^(\d{1,4})?-(\d{1,4})?$/
const BARE_YEAR = /^\d{3,4}$/

/** The date facet's values as a century chip and a from–to pair (`from` never after `to`). */
export function dateOf(
  values: readonly string[],
): Pick<FacetState, 'century' | 'yearFrom' | 'yearTo'> {
  let century: number | null = null
  let from: number | null = null
  let to: number | null = null
  const bare: number[] = []
  for (const value of values) {
    const range = RANGE.exec(value)
    if (range !== null) {
      from ??= yearOf(range[1])
      to ??= yearOf(range[2])
      continue
    }
    const chip = PERIOD_CHIPS.find((each) => String(each) === value)
    if (chip !== undefined) {
      century ??= chip
      continue
    }
    const year = BARE_YEAR.test(value) ? yearOf(value) : null
    if (year !== null) bare.push(year)
  }
  if (from === null && to === null && bare.length > 0) {
    const sorted = [...bare].sort((a, b) => a - b)
    from = sorted[0] ?? null
    to = sorted.length > 1 ? (sorted[sorted.length - 1] ?? null) : null
  }
  if (from !== null && to !== null && from > to) [from, to] = [to, from]
  return { century, yearFrom: from, yearTo: to }
}

/** The facet state a canonical listing query holds, or `null` — its place names no place. */
export function stateOfListing(
  listing: ListingState,
  places: readonly PlaceNode[],
  fallbackSort: WorkSort = 'newest',
): FacetState | null {
  const facets = listing.facets ?? {}
  const placePaths = valuesOf(facets.place)
  if (placePaths.length > 1) return null
  const [placePath] = placePaths
  const place = placePath === undefined ? null : placeIdOfPath(places, placePath.split('/'))
  if (placePath !== undefined && place === null) return null
  const page = listing.page ?? 1
  return {
    ...EMPTY_STATE,
    includeSold: valuesOf(facets.availability).includes('sold'),
    objectType: valuesOf(facets.objectType).filter((value) =>
      (OBJECT_TYPES as readonly string[]).includes(value),
    ),
    maker: idsOf(valuesOf(facets.maker)),
    place,
    ...dateOf(valuesOf(facets.date)),
    subject: idsOf(valuesOf(facets.subject)),
    sort: WORK_SORTS.find((sort) => sort === listing.sort) ?? fallbackSort,
    page: Math.min(Math.max(1, page), MAX_PAGE),
  }
}

/** A place's gazetteer path, its ancestors' slugs outermost first: `java/batavia`. */
export function placePathOf(places: readonly PlaceNode[], placeId: number): string {
  return ancestorsOf(places, placeId)
    .map((place) => place.slug)
    .join('/')
}

/** The date facet's values a state writes: the chip, then the pair as one `from-to` value. */
export function dateValuesOf(state: FacetState): readonly string[] {
  const values: string[] = []
  if (state.century !== null) values.push(String(state.century))
  if (state.yearFrom !== null || state.yearTo !== null) {
    values.push(`${state.yearFrom ?? ''}-${state.yearTo ?? ''}`)
  }
  return values
}

/** A state's facets as the listing query writes them (`href()` canonicalises the rest). */
export function facetsOfState(
  state: FacetState,
  places: readonly PlaceNode[],
): Partial<Record<FacetKey, readonly string[]>> {
  const facets: Partial<Record<FacetKey, readonly string[]>> = {}
  const set = (key: FacetKey, values: readonly string[]) => {
    if (values.length > 0) facets[key] = values
  }
  set('objectType', state.objectType)
  if (state.place !== null) set('place', [placePathOf(places, state.place)].filter(Boolean))
  set('maker', state.maker.map(String))
  set('date', dateValuesOf(state))
  set('subject', state.subject.map(String))
  if (state.includeSold) set('availability', ['sold'])
  return facets
}

/** A state as the listing query `href('browse', …)` takes. */
export function listingOfState(state: FacetState, places: readonly PlaceNode[]): ListingQuery {
  return { facets: facetsOfState(state, places), sort: state.sort, page: state.page }
}

/** A state with every filter cleared: the sort stays, the page returns to the first. */
export function clearedState(state: FacetState): FacetState {
  return { ...EMPTY_STATE, sort: state.sort }
}

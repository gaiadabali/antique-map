/**
 * A listing's facet state (5.1.a): what the URL said, parsed and closed over the contract's
 * vocabulary (`@engine/config/schema/facets`). The browse and search pages hand their
 * `searchParams` here; the loaders take this object and nothing rawer, so one state is one
 * canonical set of filters and a facet link is `href()` of a state.
 *
 * Values the URL invents — an unknown sort, an out-of-range century, a negative year — are
 * dropped, never guessed: a filter the page cannot name is not a filter the catalogue answers.
 */
import type { SortKey } from '@engine/config/schema'

/** The orders the gallery's listing offers (EXPERIENCE-GALLERY.md §4): newest · the work's date
 * old→new · new→old · maker A–Z. `relevance` is search's default and never a browse order. */
export const WORK_SORTS = ['newest', 'dateAsc', 'dateDesc', 'maker'] as const
export type WorkSort = (typeof WORK_SORTS)[number]

export const SORT_OF: Record<WorkSort, SortKey> = {
  newest: 'newest',
  dateAsc: 'dateAsc',
  dateDesc: 'dateDesc',
  maker: 'maker',
}

/** The status values the default query shows: the works on offer. */
export const DEFAULT_STATUSES = ['available', 'on-hold'] as const
/** Every status: the sold archive, joined by the page's visible "Include sold" toggle. */
export const ALL_STATUSES = [...DEFAULT_STATUSES, 'sold'] as const

/** The centuries a period chip names, as the convention counts them: the 18th is 1701–1800. */
export const PERIOD_CHIPS = [15, 16, 17, 18, 19, 20, 21] as const

export type FacetState = {
  /** `false` is the default query (available + on hold); `true` includes the sold archive. */
  readonly includeSold: boolean
  readonly objectType: readonly string[]
  readonly maker: readonly number[]
  /** A place selects it and everything within it; `null` filters no place. */
  readonly place: number | null
  /** A period chip, `18` for the 18th century. */
  readonly century: number | null
  readonly yearFrom: number | null
  readonly yearTo: number | null
  readonly subject: readonly number[]
  readonly sort: WorkSort
  readonly page: number
}

export const EMPTY_STATE: FacetState = {
  includeSold: false,
  objectType: [],
  maker: [],
  place: null,
  century: null,
  yearFrom: null,
  yearTo: null,
  subject: [],
  sort: 'newest',
  page: 1,
}

const MAX_PAGE = 200
const MAX_IDS = 40

/** A search-param value as its first spelling, or the empty string. */
export function firstOf(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

/** A repeated search param as the values it names, deduped. */
export function manyOf(value: string | string[] | undefined): readonly string[] {
  return [...new Set((Array.isArray(value) ? value : [value]).filter((v): v is string => !!v))]
}

const toIds = (values: readonly string[]): readonly number[] =>
  values
    .map((value) => Number(value))
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, MAX_IDS)

/** The listing state one page's URL holds. A sort the gallery does not offer falls to `newest`. */
export function stateOf(
  input: {
    objectType?: string | string[]
    maker?: string | string[]
    place?: string | string[]
    date?: string | string[]
    yearFrom?: string | string[]
    yearTo?: string | string[]
    subject?: string | string[]
    sold?: string | string[]
    sort?: string | string[]
    page?: string | string[]
  },
  fallbackSort: WorkSort = 'newest',
): FacetState {
  const century = Number(firstOf(input.date))
  const yearFrom = Number(firstOf(input.yearFrom))
  const yearTo = Number(firstOf(input.yearTo))
  const page = Number(firstOf(input.page))
  const sort = WORK_SORTS.find((each) => each === firstOf(input.sort)) ?? fallbackSort
  return {
    includeSold: firstOf(input.sold) === '1',
    objectType: manyOf(input.objectType),
    maker: toIds(manyOf(input.maker)),
    place: toIds(manyOf(input.place))[0] ?? null,
    century: PERIOD_CHIPS.find((each) => each === century) ?? null,
    yearFrom: Number.isSafeInteger(yearFrom) ? yearFrom : null,
    yearTo: Number.isSafeInteger(yearTo) ? yearTo : null,
    subject: toIds(manyOf(input.subject)),
    sort,
    page: Number.isSafeInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1,
  }
}

/** Whether the state filters anything at all (the applied-filter chips' emptiness check). */
export function hasFilters(state: FacetState): boolean {
  return (
    state.includeSold ||
    state.objectType.length > 0 ||
    state.maker.length > 0 ||
    state.place !== null ||
    state.century !== null ||
    state.yearFrom !== null ||
    state.yearTo !== null ||
    state.subject.length > 0
  )
}

/** The period a state asks for as a from–to year pair, or `null`: a chip, a pair, or both at once
 * (a chip bounds the pair when they disagree — the chip names the centuries' own convention). */
export function periodOf(state: FacetState): { from: number; to: number } | null {
  const chip =
    state.century === null ? null : { from: (state.century - 1) * 100 + 1, to: state.century * 100 }
  const pair =
    state.yearFrom === null && state.yearTo === null
      ? null
      : {
          from: state.yearFrom ?? -9999,
          to: state.yearTo ?? 9999,
        }
  if (chip === null && pair === null) return null
  if (chip === null) return pair!
  if (pair === null) return chip
  return { from: Math.max(chip.from, pair.from), to: Math.min(chip.to, pair.to) }
}

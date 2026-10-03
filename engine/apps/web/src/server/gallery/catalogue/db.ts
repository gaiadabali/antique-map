/**
 * The SQL the gallery's listing, facet and search reads run (5.1.a). The cms package's public
 * queries cannot say these reads — a facet count that applies every filter but its own, a date
 * sort on a fuzzy date, a place's roll-up — so they run as raw SQL through the adapter's pool,
 * the same sanctioned fallback the shop's search uses (ARCHITECTURE.md §9). **Every query filters
 * `_status = 'published'` itself**: raw SQL runs outside Payload's access rules, so the
 * published-only rule lives here, next to the filters that must carry it.
 *
 * The SQL answers ids, counts and text only; the card projection (`./projection`) stays a Payload
 * read with `overrideAccess: false` and an explicit `select`, so a search result is exactly a
 * listing card.
 */
import type { Payload } from 'payload'

import { SQL_EARLIEST_YEAR, SQL_LATEST_YEAR } from './date-reading'
import type { FacetState } from './state'
import { ALL_STATUSES, DEFAULT_STATUSES, periodOf } from './state'

type QueryPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

/** The adapter's pool: the one Postgres connection every read of this process shares. */
export function poolOf(payload: Payload): QueryPool {
  const pool = (payload.db as unknown as { pool?: unknown }).pool
  if (typeof (pool as QueryPool | undefined)?.query !== 'function') {
    throw new TypeError('gallery catalogue: payload.db.pool.query is not a function')
  }
  return pool as QueryPool
}

/** A number a row carries, or `null` when it is not one. */
/** The number a SQL cell holds: Postgres hands `int8` back as a string, so both shapes answer. */
export function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

/** The work ids one facet state selects, as the SQL parameters and the WHERE parts they build. */
export type WhereParts = {
  /** The WHERE clauses over `w` (the `works` table), each parameterised by its `$n`. */
  readonly clauses: readonly string[]
  /** The parameters, in the order the clauses name them. */
  readonly values: readonly unknown[]
}

const ANY = (n: number) => `$${n}::int[]`

/** An untyped `ANY($n)`: the driver sends the words as text and Postgres reads them as the
 * enum array the column holds (`work_status_vocabulary`, `enum_works_object_type`) — the
 * explicit `::int[]` cast of `ANY` is for the id columns alone. */
const ANY_WORDS = (n: number) => `$${n}`

/** What the filter builder needs besides the state: the place tree's own knowledge, as a
 * resolver a facet read has already loaded (`./places`), so a place selects it and its
 * descendants and the SQL never walks the tree itself. */
export type FilterContext = {
  /** A place id as the ids the filter covers — the place and everything within it. */
  readonly placeIds: (placeId: number) => readonly number[]
}

/**
 * The filters every facet read shares. `without` drops one facet's own filter — the all-but-own
 * rule the counts follow (EXPERIENCE-GALLERY.md §4). Availability defaults to the works on
 * offer; `sold` is a filter of the availability facet, so the toggle belongs to it.
 */
export function filterParts(
  state: FacetState,
  ctx: FilterContext,
  without?: 'availability' | 'objectType' | 'maker' | 'place' | 'date' | 'subject',
): WhereParts {
  const clauses: string[] = [`w._status = 'published'`]
  const values: unknown[] = []
  const add = (clause: string, value: unknown) => {
    clauses.push(clause)
    values.push(value)
  }

  if (without !== 'availability') {
    const statuses = state.includeSold ? ALL_STATUSES : DEFAULT_STATUSES
    add(`w.status = ANY(${ANY_WORDS(values.length + 1)})`, [...statuses])
  }
  if (without !== 'objectType' && state.objectType.length > 0) {
    add(`w.object_type = ANY(${ANY_WORDS(values.length + 1)})`, [...state.objectType])
  }
  if (without !== 'maker' && state.maker.length > 0) {
    add(
      `EXISTS (SELECT 1 FROM works_makers wm WHERE wm._parent_id = w.id AND wm.maker_id = ANY(${ANY(
        values.length + 1,
      )}))`,
      [...state.maker],
    )
  }
  if (without !== 'place' && state.place !== null) {
    // A place selects it and everything within it, resolved by the caller's tree.
    add(
      `EXISTS (SELECT 1 FROM works_places wp WHERE wp._parent_id = w.id AND wp.place_id = ANY(${ANY(
        values.length + 1,
      )}))`,
      ctx.placeIds(state.place),
    )
  }
  if (without !== 'date') {
    const period = periodOf(state)
    if (period !== null) {
      add(`${SQL_EARLIEST_YEAR} <= ${period.to}`, [])
      add(`${SQL_LATEST_YEAR} >= ${period.from}`, [])
    }
  }
  if (without !== 'subject' && state.subject.length > 0) {
    add(
      `EXISTS (SELECT 1 FROM works_rels wr WHERE wr.parent_id = w.id AND wr.path = 'subjects' AND wr.terms_id = ANY(${ANY(
        values.length + 1,
      )}))`,
      [...state.subject],
    )
  }
  return { clauses, values }
}

/** `WHERE …` from parts, or `''` when nothing filters. */
export function whereOf(parts: WhereParts): string {
  return parts.clauses.length > 0 ? `WHERE ${parts.clauses.join(' AND ')}` : ''
}

/** The order one listing page runs: the fuzzy date's reading orders the date sorts
 * (`./date-reading`) — earliest old→new, latest new→old — and maker A–Z by the first maker's
 * `sort_name`. A sort with no year on it puts the undated last, never lost. */
export function orderOf(state: FacetState): string {
  switch (state.sort) {
    case 'dateAsc':
      return `ORDER BY ${SQL_EARLIEST_YEAR} ASC NULLS LAST, w.id ASC`
    case 'dateDesc':
      return `ORDER BY ${SQL_LATEST_YEAR} DESC NULLS LAST, w.id ASC`
    case 'maker':
      return `ORDER BY (SELECT m.sort_name FROM works_makers wm
                JOIN makers m ON m.id = wm.maker_id
                WHERE wm._parent_id = w.id ORDER BY wm._order LIMIT 1) ASC NULLS LAST, w.id ASC`
    default:
      return 'ORDER BY w.created_at DESC, w.id ASC'
  }
}

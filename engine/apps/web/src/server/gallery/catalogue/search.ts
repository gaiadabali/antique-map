/**
 * The gallery's search (5.1.c): one function behind a small interface, importable without a
 * React tree, that serves the search page now and the chat's `search_catalogue` tool later
 * (ARCHITECTURE.md §9). Published-only is in the SQL itself (`./search-sql`); the projection
 * stays a Payload read (`./projection`), so a search result is exactly a listing card.
 *
 * **This is the ticket's sanctioned plain-query fallback, not the search engine.** Postgres
 * full text in the derived `search_documents` table is §9's design and that table does not exist
 * yet, so this matches — through `unaccent()` when the extension is installed, `LOWER` when it
 * is not — the hook and original titles, maker names and their aliases, places by their modern
 * and historical names (Batavia, Celebes, Buitenzorg), subjects and stock numbers, token by
 * token. A term that names a place widens to that place and its descendants, so "Celebes" and
 * "Sulawesi" find the same works. `pg_trgm`, when installed, gives exactly one "Did you mean"
 * on a zero-result query. A stock-number query (`M.0500`) jumps to its item.
 *
 * // TODO(search-documents): replace this module whole when the derived table lands (§9) — its
 * refresh job will own the date reading (`./date-reading`) and this module's match set.
 */
import type { Payload } from 'payload'

import type { SiteLocale } from '@engine/config/sites'

import { SITES } from '@engine/config/sites'

import { poolOf, num } from './db'
import { descendantIdsOf, type PlaceNode } from './places'
import {
  DIRECT_SQL,
  MAX_RESULTS,
  PLACE_SQL,
  PLACE_TREE_SQL,
  PLACE_WORKS_SQL,
  STOCK_SQL,
  SUGGESTION_SQL,
} from './search-sql'
import { ALL_STATUSES, DEFAULT_STATUSES } from './state'
import type { SearchResultVM, SearchSuggestion } from './view-models'

/** What `searchWorkIds` answers, before the cards are projected. */
export type SearchIds = {
  readonly ids: readonly number[]
  readonly suggestion: SearchSuggestion | null
  readonly jumpTo: SearchResultVM['jumpTo']
}

type Pool = ReturnType<typeof poolOf>

const MAX_TOKENS = 8
const MAX_TOKEN_LENGTH = 40
/** The lowest trigram similarity a "Did you mean" may claim: a near miss, not a different word. */
const MIN_SIMILARITY = 0.3
/** The undefined-function Postgres code: the extension is not installed on this database. */
const UNDEFINED_FUNCTION = '42883'

const NOTHING: SearchIds = { ids: [], suggestion: null, jumpTo: null }

/** A search term as a LIKE pattern. Tokens hold letters and numbers only, so no wildcard. */
const patternOf = (token: string) => `%${token.toLowerCase()}%`

const TOKENS = /[^\p{L}\p{N}]+/u

/** The query's tokens: letters and numbers only, capped, never a wildcard. */
export function tokensOf(query: string): readonly string[] {
  return query
    .split(TOKENS)
    .map((token) => token.toLowerCase().slice(0, MAX_TOKEN_LENGTH))
    .filter((token) => token !== '')
    .slice(0, MAX_TOKENS)
}

/** Whether a whole query names a stock number (`M.0500` — the gallery's own pattern). */
export function isStockNumber(query: string): boolean {
  const pattern = SITES.gallery.works.stockNumberPattern ?? '^[MPF]\\.[A-Za-z0-9]+$'
  return new RegExp(pattern, 'i').test(query.trim())
}

/** `unaccent(LOWER(x))` when the extension answers, plain `LOWER(x)` when it does not. */
const foldOf = (useUnaccent: boolean) => (column: string) =>
  useUnaccent ? `unaccent(LOWER(${column}))` : `LOWER(${column})`

/** Runs `run` with `unaccent`; on an undefined-function error runs it plain, once. */
async function withFallback<T>(run: (fold: (column: string) => string) => Promise<T>): Promise<T> {
  try {
    return await run(foldOf(true))
  } catch (error) {
    if ((error as { code?: string }).code !== UNDEFINED_FUNCTION) throw error
    return run(foldOf(false))
  }
}

const idsOfRows = ({ rows }: { rows: Array<Record<string, unknown>> }): number[] =>
  rows.map((row) => num(row.id)).filter((id): id is number => id !== null)

/** The ids of the published works the tokens match, ordered by how many tokens each matches —
 * the search's own "relevance". A place-naming token widens to the place and its descendants. */
export async function searchWorkIds(
  payload: Payload,
  options: { query: string; locale: SiteLocale; includeSold: boolean },
): Promise<SearchIds> {
  const query = options.query.trim()
  const tokens = tokensOf(query)
  if (tokens.length === 0) return NOTHING
  const pool = poolOf(payload)
  const statuses = options.includeSold ? [...ALL_STATUSES] : [...DEFAULT_STATUSES]

  const [placeSets, jumpTo] = await Promise.all([
    placeMatches(pool, tokens, statuses),
    stockJump(pool, query, options.locale),
  ])

  const scores = new Map<number, number>()
  for (const token of tokens) {
    const direct = await withFallback((fold) =>
      pool.query(DIRECT_SQL(fold, 2), [statuses, patternOf(token)]).then(idsOfRows),
    )
    // The works the direct texts miss but a widened place holds are found all the same.
    for (const id of new Set([...direct, ...(placeSets.get(token) ?? [])])) {
      scores.set(id, (scores.get(id) ?? 0) + 1)
    }
  }

  const ids = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([id]) => id)
    .slice(0, MAX_RESULTS)
  const suggestion = ids.length === 0 && jumpTo === null ? await suggestionOf(pool, query) : null
  return { ids, suggestion, jumpTo }
}

/** For each token that names a place — modern or historical — the works of that place and every
 * place within it. */
async function placeMatches(
  pool: Pool,
  tokens: readonly string[],
  statuses: readonly string[],
): Promise<ReadonlyMap<string, readonly number[]>> {
  const matched = new Map<string, number[]>()
  for (const token of tokens) {
    const ids = await withFallback((fold) =>
      pool.query(PLACE_SQL(fold, 1), [patternOf(token)]).then(idsOfRows),
    )
    if (ids.length > 0) matched.set(token, ids)
  }
  const answer = new Map<string, readonly number[]>()
  if (matched.size === 0) return answer
  const { rows } = await pool.query(PLACE_TREE_SQL)
  const places: readonly PlaceNode[] = rows.map((row) => ({
    id: Number(row.id),
    slug: '',
    name: '',
    parentId: num(row.parent_id),
  }))
  for (const [token, ids] of matched) {
    const widened = new Set(ids.flatMap((id) => [...descendantIdsOf(places, id)]))
    answer.set(token, idsOfRows(await pool.query(PLACE_WORKS_SQL, [statuses, [...widened]])))
  }
  return answer
}

/** The stock number the query names exactly, when it does: the jump to the item's page. */
async function stockJump(
  pool: Pool,
  query: string,
  locale: SiteLocale,
): Promise<SearchIds['jumpTo']> {
  if (!isStockNumber(query)) return null
  const { rows } = await pool.query(STOCK_SQL, [query, locale])
  const row = rows[0]
  const publicId = num(row?.public_id)
  if (row === undefined || publicId === null) return null
  return {
    publicId,
    workUid: typeof row.work_uid === 'string' ? row.work_uid : null,
    title: typeof row.title === 'string' ? row.title : '',
  }
}

const SUGGESTION_KINDS = ['maker', 'place', 'subject'] as const

/** The one "Did you mean" a zero-result search offers: the closest name the catalogue carries —
 * a maker (an alias resolving to the maker), a place by its modern or historical name, or a
 * subject. `pg_trgm` scores; without the extension there is no suggestion, never a wrong one. */
async function suggestionOf(pool: Pool, query: string): Promise<SearchSuggestion | null> {
  try {
    const { rows } = await pool.query(SUGGESTION_SQL, [query, MIN_SIMILARITY])
    const row = rows[0]
    const kind = SUGGESTION_KINDS.find((each) => each === row?.kind)
    if (row === undefined || kind === undefined) return null
    return {
      kind,
      label: String(row.label),
      ...(typeof row.historical === 'string' ? { historical: row.historical } : {}),
    }
  } catch (error) {
    if ((error as { code?: string }).code !== UNDEFINED_FUNCTION) throw error
    return null
  }
}

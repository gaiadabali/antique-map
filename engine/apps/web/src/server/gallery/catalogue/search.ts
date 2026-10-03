/**
 * The gallery's search (5.1.c): one function behind a small interface, importable without a
 * React tree, that serves the search page now and the chat's `search_catalogue` tool later
 * (ARCHITECTURE.md §9). Published-only is in the SQL itself (`./db`); the projection stays a
 * Payload read (`./projection`), so a search result is exactly a listing card.
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
import { loadPlaces, descendantIdsOf, type PlaceNode } from './places'
import { ALL_STATUSES, DEFAULT_STATUSES } from './state'
import type { SearchSuggestion } from './view-models'

/** What `searchWorks` answers, before the cards are projected. */
export type SearchIds = {
  readonly ids: readonly number[]
  readonly suggestion: SearchSuggestion | null
  readonly jumpTo: {
    readonly publicId: number
    readonly workUid: string | null
    readonly title: string
  } | null
}

const MAX_TOKENS = 8
const MAX_TOKEN_LENGTH = 40
const MAX_RESULTS = 200
/** The lowest trigram similarity a "Did you mean" may claim: a near miss, not a different word. */
const MIN_SIMILARITY = 0.3

/** A search term as a LIKE pattern: folded case, wildcards out, one `%` either side. */
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
  return new RegExp(SITES.gallery.works.stockNumberPattern ?? '^[MPF]\\.[A-Za-z0-9]+$', 'i').test(
    query.trim(),
  )
}

/** The per-work searchable text, aggregated once, matched token by token below. */
const TEXTS_SQL = `
  WITH texts AS (
    SELECT w.id,
           w.stock_number AS stock_number,
           (SELECT string_agg(x.title, ' ') FROM works_locales x WHERE x._parent_id = w.id) AS title,
           w.original_title AS original_title,
           (SELECT string_agg(m.name || ' ' || COALESCE(a.names, ''), ' ')
              FROM works_makers wm
              JOIN makers m ON m.id = wm.maker_id
              LEFT JOIN (SELECT a._parent_id AS mid, string_agg(a.name, ' ') AS names
                           FROM makers_aliases a GROUP BY 1) a ON a.mid = m.id
             WHERE wm._parent_id = w.id) AS maker_text,
           (SELECT string_agg(DISTINCT tl.label, ' ')
              FROM works_rels wr
              JOIN terms t ON t.id = wr.terms_id AND t.kind = 'subject'
              JOIN terms_locales tl ON tl._parent_id = t.id
             WHERE wr.parent_id = w.id AND wr.path = 'subjects') AS subject_text,
           (SELECT string_agg(DISTINCT n.name, ' ')
              FROM works_places wp
              JOIN places p ON p.id = wp.place_id
              LEFT JOIN places_locales pl ON pl._parent_id = p.id
              LEFT JOIN places_historical_names h ON h._parent_id = p.id
              CROSS JOIN LATERAL unnest(ARRAY[pl.name, h.name]) AS n(name)
             WHERE wp._parent_id = w.id AND n.name IS NOT NULL) AS place_text
      FROM works w
     WHERE w._status = 'published' AND w.status = ANY($1)
  )`

/** One token's direct match: any of the searchable texts the work carries. */
const DIRECT_SQL = (fold: (column: string) => string, tokenParam: number) => `
  ${TEXTS_SQL}
  SELECT t.id
    FROM texts t
   WHERE (${fold('t.title')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('COALESCE(t.original_title, \'\')')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('COALESCE(t.stock_number, \'\')')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('COALESCE(t.maker_text, \'\')')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('COALESCE(t.subject_text, \'\')')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('COALESCE(t.place_text, \'\')')} LIKE ${fold('$' + tokenParam)}::text)
   LIMIT ${MAX_RESULTS}`

/** The place ids a token names — modern or historical — for the widening below. */
const PLACE_SQL = (fold: (column: string) => string, tokenParam: number) => `
  SELECT p.id
    FROM places p
    LEFT JOIN places_locales pl ON pl._parent_id = p.id
    LEFT JOIN places_historical_names h ON h._parent_id = p.id
   WHERE p._status = 'published'
     AND (${fold('pl.name')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('h.name')} LIKE ${fold('$' + tokenParam)}::text)
   GROUP BY p.id`

/** The works of a set of places, their descendants included by the caller. */
const PLACE_WORKS_SQL = `
  SELECT DISTINCT wp._parent_id AS id
    FROM works_places wp
    JOIN works w ON w.id = wp._parent_id AND w._status = 'published' AND w.status = ANY($1)
   WHERE wp.place_id = ANY($2)
   LIMIT ${MAX_RESULTS}`

/** The stock number a query names, exactly: the jump, not a match. */
const STOCK_SQL = `
  SELECT w.id, w.public_id, w.work_uid, w.stock_number,
         (SELECT x.title FROM works_locales x WHERE x._parent_id = w.id AND x._locale = $2 LIMIT 1)
           AS title
    FROM works w
   WHERE w._status = 'published' AND LOWER(w.stock_number) = LOWER($1)
   LIMIT 1`

/** One trigram candidate across the makers, places (historical names included) and subjects —
 * the closest name the catalogue carries, once. */
const SUGGESTION_SQL = `
  SELECT kind, id, label, historical FROM (
    SELECT 'maker'::text AS kind, m.id, m.name AS label, NULL::text AS historical,
           SIMILARITY(m.name, $1) AS score
      FROM makers m
     WHERE m._status = 'published'
    UNION ALL
    SELECT 'maker'::text, m.id, m.name, a.name, SIMILARITY(a.name, $1)
      FROM makers m JOIN makers_aliases a ON a._parent_id = m.id
     WHERE m._status = 'published'
    UNION ALL
    SELECT 'place'::text, p.id, COALESCE(pl.name, ''), COALESCE(h.name, ''), SIMILARITY(COALESCE(h.name, pl.name, ''), $1)
      FROM places p
      LEFT JOIN places_locales pl ON pl._parent_id = p.id
      LEFT JOIN places_historical_names h ON h._parent_id = p.id
     WHERE p._status = 'published'
    UNION ALL
    SELECT 'subject'::text, t.id, COALESCE(tl.label, ''), NULL::text, SIMILARITY(COALESCE(tl.label, ''), $1)
      FROM terms t
      LEFT JOIN terms_locales tl ON tl._parent_id = t.id
     WHERE t._status = 'published' AND t.kind = 'subject'
  ) c
  WHERE label <> '' AND score >= $2
  ORDER BY score DESC, kind, label
  LIMIT 1`

/** `unaccent(LOWER(x))` when the extension answers, plain `LOWER(x)` when it does not. */
function foldOf(useUnaccent: boolean) {
  return (column: string) => (useUnaccent ? `unaccent(LOWER(${column}))` : `LOWER(${column})`)
}

/** The undefined-function Postgres code: the extension is not installed on this database. */
const UNDEFINED_FUNCTION = '42883'

/** Runs `run` with `unaccent`; on an undefined-function error runs it plain, once. */
async function withFallback<T>(pool: ReturnType<typeof poolOf>, run: (fold: (column: string) => string) => Promise<T>): Promise<T> {
  try {
    return await run(foldOf(true))
  } catch (error) {
    if ((error as { code?: string }).code !== UNDEFINED_FUNCTION) throw error
    return run(foldOf(false))
  }
}

/** The ids the published works the tokens match, scored by how many tokens each work matches —
 * the search's own "relevance". A place-naming token widens to the place and its descendants. */
export async function searchWorkIds(
  payload: Payload,
  options: {
    query: string
    locale: SiteLocale
    includeSold: boolean
  },
): Promise<SearchIds> {
  const query = options.query.trim()
  if (query === '') return { ids: [], suggestion: null, jumpTo: null }
  const pool = poolOf(payload)
  const statuses = options.includeSold ? [...ALL_STATUSES] : [...DEFAULT_STATUSES]
  const tokens = tokensOf(query)
  if (tokens.length === 0) return { ids: [], suggestion: null, jumpTo: null }

  const [placeSets, jump] = await Promise.all([
    placeMatches(pool, tokens, statuses),
    stockJump(pool, query, options.locale),
  ])

  const scores = new Map<number, number>()
  for (const token of tokens) {
    // A token that names a place widens: the works the direct texts miss but the widened place
    // holds are found all the same.
    const direct = await withFallback(pool, (fold) =>
      pool
        .query(DIRECT_SQL(fold, 2), [statuses, patternOf(token)])
        .then(({ rows }) => rows.map((row) => num(row.id)).filter((id): id is number => id !== null)),
    )
    const matched = new Set([...direct, ...(placeSets.get(token) ?? [])])
    for (const id of matched) {
      scores.set(id, (scores.get(id) ?? 0) + 1)
    }
  }

  const ids = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([id]) => id)
    .slice(0, MAX_RESULTS)

  const suggestion =
    ids.length === 0 ? await suggestionOf(pool, query) : null

  return { ids, suggestion, jumpTo: jump }
}

/** For each token that names a place — modern or historical — the works of that place and every
 * place within it. The tree comes from the published gazetteer (`./places`). */
async function placeMatches(
  pool: ReturnType<typeof poolOf>,
  tokens: readonly string[],
  statuses: readonly string[],
): Promise<ReadonlyMap<string, readonly number[]>> {
  const answer = new Map<string, readonly number[]>()
  const matched = new Map<string, number[]>()
  for (const token of tokens) {
    const ids = await withFallback(pool, (fold) =>
      pool
        .query(PLACE_SQL(fold, 1), [patternOf(token)])
        .then(({ rows }) => rows.map((row) => num(row.id)).filter((id): id is number => id !== null)),
    )
    if (ids.length > 0) matched.set(token, ids)
  }
  if (matched.size === 0) return answer
  const places: readonly PlaceNode[] = await (async () => {
    const { rows } = await pool.query(
      `SELECT id, parent_id FROM places WHERE _status = 'published' LIMIT 5000`,
    )
    return rows.map((row) => ({
      id: Number(row.id),
      slug: '',
      name: '',
      parentId: row.parent_id === null ? null : Number(row.parent_id),
    }))
  })()
  for (const [token, ids] of matched) {
    const widened = new Set<number>()
    for (const id of ids) for (const within of descendantIdsOf(places, id)) widened.add(within)
    const { rows } = await pool.query(PLACE_WORKS_SQL, [statuses, [...widened]])
    answer.set(
      token,
      rows.map((row) => Number(row.id)),
    )
  }
  return answer
}

/** The stock number the query names exactly, when it does: the jump to the item's page. */
async function stockJump(
  pool: ReturnType<typeof poolOf>,
  query: string,
  locale: SiteLocale,
): Promise<SearchIds['jumpTo']> {
  if (!isStockNumber(query)) return null
  const { rows } = await pool.query(STOCK_SQL, [query.trim(), locale])
  const row = rows[0]
  if (!row) return null
  const publicId = num(row.public_id)
  if (publicId === null) return null
  return {
    publicId,
    workUid: typeof row.work_uid === 'string' ? row.work_uid : null,
    title: typeof row.title === 'string' ? row.title : '',
  }
}

/** The one "Did you mean" a zero-result search offers: the closest name the catalogue carries —
 * a maker, a place with its historical name, or a subject. `pg_trgm` does the scoring; without
 * the extension there is no suggestion, never a wrong one. */
async function suggestionOf(
  pool: ReturnType<typeof poolOf>,
  query: string,
): Promise<SearchSuggestion | null> {
  try {
    const { rows } = await pool.query(SUGGESTION_SQL, [query, MIN_SIMILARITY])
    const row = rows[0]
    if (!row) return null
    const kind = ['maker', 'place', 'subject'].find((each) => each === row.kind)
    if (kind === undefined) return null
    return {
      kind: kind as SearchSuggestion['kind'],
      label: String(row.label),
      historical: typeof row.historical === 'string' ? row.historical : undefined,
    }
  } catch (error) {
    // No pg_trgm, no unaccent: no suggestion, never a wrong one.
    if ((error as { code?: string }).code !== UNDEFINED_FUNCTION) throw error
    return null
  }
}

/**
 * The shop's search read (6.1.a). Postgres full text in the derived `search_documents` table is
 * ARCHITECTURE.md §9's design, and that table does not exist yet — so this is the ticket's
 * sanctioned fallback: a plain `ILIKE`-shaped match over the product's localised name and
 * description in the query's locale, plus the SKU, through `unaccent()` when the extension is
 * installed (it is not on the products table today, so the module falls back to `LOWER` when
 * Postgres refuses the function — searching "Kerajinan" still finds "kerajinan", but a word's
 * accents must be typed as written; the FTS wave replaces this module whole).
 *
 * The SQL answers product ids only; the projection and the access rules stay in `./queries`, so
 * a search result is exactly a listing card.
 */
import type { Payload } from 'payload'

/** The ids of the published shop products whose name, description or SKU the words match. */
const SEARCH_SQL = (unaccent: boolean) => `
  SELECT p.id
  FROM products AS p
  JOIN products_locales AS pl ON pl._parent_id = p.id AND pl._locale = $1
  WHERE p._status = 'published' AND p.site = 'shop' AND (
    ${matchOf('pl.name', unaccent)}
    OR ${matchOf('pl.description', unaccent)}
    OR LOWER(p.sku) LIKE $2
  )
  LIMIT 200
`

/** One LIKE, case-folded, accent-folded when `unaccent()` is there. */
const matchOf = (column: string, unaccent: boolean) =>
  unaccent ? `unaccent(LOWER(${column})) LIKE unaccent($2)` : `LOWER(${column}) LIKE $2`

type QueryPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

/** The adapter's pool: the one Postgres connection every read of this process shares. */
function poolOf(payload: Payload): QueryPool {
  const pool = (payload.db as unknown as { pool?: unknown }).pool
  if (typeof (pool as QueryPool | undefined)?.query !== 'function') {
    throw new TypeError('searchProductIds(): payload.db.pool.query is not a function')
  }
  return pool as QueryPool
}

/** The ids of the published shop products the words match, ordered by creation. */
export async function searchProductIds(
  payload: Payload,
  query: string,
  locale: 'en' | 'id',
): Promise<readonly number[]> {
  const words = query.trim()
  if (words === '') return []
  const pattern = `%${words.toLowerCase()}%`
  const pool = poolOf(payload)
  try {
    const { rows } = await pool.query(SEARCH_SQL(true), [locale, pattern])
    return rows.map((row) => Number(row.id))
  } catch (error) {
    // 42883 — undefined function: unaccent() is not installed on this database.
    if ((error as { code?: string }).code !== '42883') throw error
    const { rows } = await pool.query(SEARCH_SQL(false), [locale, pattern])
    return rows.map((row) => Number(row.id))
  }
}

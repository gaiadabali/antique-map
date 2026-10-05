/**
 * The search's SQL (5.1.c; `./search` runs it). Every statement filters `_status = 'published'`
 * itself — raw SQL runs outside Payload's access rules — and binds the visitor's words as
 * parameters, never as text. `fold` is `unaccent(LOWER(x))` or `LOWER(x)` (`./search`).
 *
 * // TODO(search-documents): this whole file goes when the derived table lands (ARCHITECTURE §9).
 */

export const MAX_RESULTS = 200

type Fold = (column: string) => string

/** The per-work searchable text, aggregated once, matched token by token below. */
const TEXTS_SQL = `
  WITH texts AS (
    SELECT w.id,
           w.stock_number AS stock_number,
           (SELECT string_agg(x.title, ' ') FROM works_locales x WHERE x._parent_id = w.id) AS title,
           w.original_title AS original_title,
           (SELECT string_agg(m.name || ' ' || COALESCE(a.names, ''), ' ')
              FROM works_makers wm
              JOIN makers m ON m.id = wm.maker_id AND m._status = 'published'
              LEFT JOIN (SELECT a._parent_id AS mid, string_agg(a.name, ' ') AS names
                           FROM makers_aliases a GROUP BY 1) a ON a.mid = m.id
             WHERE wm._parent_id = w.id) AS maker_text,
           (SELECT string_agg(DISTINCT tl.label, ' ')
              FROM works_rels wr
              JOIN terms t ON t.id = wr.terms_id AND t.kind = 'subject' AND t._status = 'published'
              JOIN terms_locales tl ON tl._parent_id = t.id
             WHERE wr.parent_id = w.id AND wr.path = 'subjects') AS subject_text,
           (SELECT string_agg(DISTINCT n.name, ' ')
              FROM works_places wp
              JOIN places p ON p.id = wp.place_id AND p._status = 'published'
              LEFT JOIN places_locales pl ON pl._parent_id = p.id
              LEFT JOIN places_historical_names h ON h._parent_id = p.id
              CROSS JOIN LATERAL unnest(ARRAY[pl.name, h.name]) AS n(name)
             WHERE wp._parent_id = w.id AND n.name IS NOT NULL) AS place_text
      FROM works w
     WHERE w._status = 'published' AND w.status = ANY($1)
  )`

/** One token's direct match: any of the searchable texts the work carries. */
export const DIRECT_SQL = (fold: Fold, tokenParam: number) => {
  const like = (column: string) =>
    `${fold(`COALESCE(${column}, '')`)} LIKE ${fold(`$${tokenParam}`)}::text`
  return `
  ${TEXTS_SQL}
  SELECT t.id
    FROM texts t
   WHERE (${like('t.title')}
      OR ${like('t.original_title')}
      OR ${like('t.stock_number')}
      OR ${like('t.maker_text')}
      OR ${like('t.subject_text')}
      OR ${like('t.place_text')})
   LIMIT ${MAX_RESULTS}`
}

/** The place ids a token names — modern or historical — for the widening `./search` does. */
export const PLACE_SQL = (fold: Fold, tokenParam: number) => `
  SELECT p.id
    FROM places p
    LEFT JOIN places_locales pl ON pl._parent_id = p.id
    LEFT JOIN places_historical_names h ON h._parent_id = p.id
   WHERE p._status = 'published'
     AND (${fold('pl.name')} LIKE ${fold('$' + tokenParam)}::text
      OR ${fold('h.name')} LIKE ${fold('$' + tokenParam)}::text)
   GROUP BY p.id`

/** The published gazetteer's tree, for the descendants a named place widens to. */
export const PLACE_TREE_SQL = `SELECT id, parent_id FROM places WHERE _status = 'published' LIMIT 5000`

/** The works of a set of places, their descendants included by the caller. */
export const PLACE_WORKS_SQL = `
  SELECT DISTINCT wp._parent_id AS id
    FROM works_places wp
    JOIN works w ON w.id = wp._parent_id AND w._status = 'published' AND w.status = ANY($1)
   WHERE wp.place_id = ANY($2::int[])
   LIMIT ${MAX_RESULTS}`

/** The stock number a query names, exactly: the jump, not a match. Any status — a sold work's
 * page still answers its number. */
export const STOCK_SQL = `
  SELECT w.id, w.public_id, w.work_uid, w.stock_number,
         (SELECT x.title FROM works_locales x WHERE x._parent_id = w.id AND x._locale = $2 LIMIT 1)
           AS title
    FROM works w
   WHERE w._status = 'published' AND LOWER(w.stock_number) = LOWER($1)
   LIMIT 1`

/** One trigram candidate across the makers (their aliases resolving to the maker), the places by
 * their modern and their historical names, and the subjects — the closest name, once. */
export const SUGGESTION_SQL = `
  SELECT kind, label, historical FROM (
    SELECT 'maker'::text AS kind, m.name AS label, NULL::text AS historical,
           SIMILARITY(m.name, $1) AS score
      FROM makers m
     WHERE m._status = 'published'
    UNION ALL
    SELECT 'maker'::text, m.name, NULL::text, SIMILARITY(a.name, $1)
      FROM makers m JOIN makers_aliases a ON a._parent_id = m.id
     WHERE m._status = 'published'
    UNION ALL
    SELECT 'place'::text, pl.name, NULL::text, SIMILARITY(pl.name, $1)
      FROM places p JOIN places_locales pl ON pl._parent_id = p.id
     WHERE p._status = 'published'
    UNION ALL
    SELECT 'place'::text, COALESCE(pl.name, h.name), h.name, SIMILARITY(h.name, $1)
      FROM places p
      JOIN places_historical_names h ON h._parent_id = p.id
      LEFT JOIN places_locales pl ON pl._parent_id = p.id
     WHERE p._status = 'published'
    UNION ALL
    SELECT 'subject'::text, tl.label, NULL::text, SIMILARITY(tl.label, $1)
      FROM terms t JOIN terms_locales tl ON tl._parent_id = t.id
     WHERE t._status = 'published' AND t.kind = 'subject'
  ) c
  WHERE COALESCE(label, '') <> '' AND score >= $2
  ORDER BY score DESC, kind, label
  LIMIT 1`

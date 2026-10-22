/**
 * Reading and writing query values (`./parse`).
 *
 * What `./parse.ts` reads from a query string, and how it writes the canonical one back: a
 * `URLSearchParams` or a Next page's `searchParams` record read alike, values kept only in the
 * form `href()` writes them (a positive id, a lowercase UUID). Pure.
 */

/** `URLSearchParams`, or the record a Next page receives as `searchParams`. */
export type SearchInput =
  | { get(name: string): string | null; getAll(name: string): string[] }
  | Readonly<Record<string, string | readonly string[] | undefined>>

/** Every value a query holds for a key, in order: `[]` when it holds none. */
export function reader(search: SearchInput): (key: string) => string[] {
  if (typeof search.getAll === 'function' && typeof search.get === 'function') {
    return (key) => (search.getAll as (name: string) => string[])(key)
  }
  const record = search as Readonly<Record<string, string | readonly string[] | undefined>>
  return (key) => [record[key] ?? []].flat()
}

/** A query string in the order given, empty values left out: `?item=3&topic=framing`, or `''`. */
export function query(values: Record<string, string | number | undefined>): string {
  const pairs = Object.entries(values).flatMap(([key, value]) =>
    value === undefined || value === '' ? [] : [`${key}=${encodeURIComponent(value)}`],
  )
  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}

/** A positive safe integer from a query value, else null. */
export function positive(value: string | undefined): number | null {
  const n = Number(value)
  return value !== undefined && Number.isSafeInteger(n) && n > 0 ? n : null
}

/** A record's `ref` from a query value, as the lowercase UUID it is written as, else null. */
export function uuid(value: string | undefined): string | null {
  return value !== undefined && UUID.test(value) ? value : null
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

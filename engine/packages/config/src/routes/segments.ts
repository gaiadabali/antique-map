/**
 * @contract C10 — the route map: a public path's segments, read strictly · owner: ARC · entry: `@engine/config/routes`
 *
 * `href()` writes every segment one way — `encodeURIComponent` of its text — so a path is read
 * only in that spelling: a segment that does not survive decode-then-encode is no address of any
 * page (`/pr%6Fduct/1706` would otherwise serve the item at a second URL with a 200, 3.1
 * senior-fe #13). Nor is one that decodes to a `/` — `%2F` would join two segments into one, a
 * second spelling of a named browse path — nor an empty one: `//` or a trailing `/` (Next 16
 * answers both with a 308 before the proxy runs; refused here too, 3.4 senior-be #9). The one
 * exception is the item's `{id}-{slug}` segment, whose slug part may be any old link's
 * (`./parse.ts`). Pure.
 */

/** One segment as asked for: its raw spelling, its text, and whether `href()` spells it so. */
export type ReadSegment = {
  readonly raw: string
  readonly text: string
  readonly canonical: boolean
}

/**
 * The path's segments, each decoded — or `null` when one is no segment at all: undecodable
 * (`%E0%A4%A`), decoding to a `/`, or empty (`//`, a trailing `/`; the root `/` has none).
 */
export function readSegments(pathname: string): ReadSegment[] | null {
  if (pathname === '/') return []
  const segments: ReadSegment[] = []
  for (const raw of pathname.split('/').slice(1)) {
    if (raw === '') return null
    let text: string
    try {
      text = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (text.includes('/')) return null
    segments.push({ raw, text, canonical: encodeURIComponent(text) === raw })
  }
  return segments
}

/**
 * The path's segments decoded, or `null` when one is not in `href()`'s spelling: undecodable,
 * decoding to a `/`, empty, or written another way than `encodeURIComponent` writes it (`%6F` for
 * `o`, a lower-case `%c3%a9`, a raw `,`).
 */
export function decodeSegments(pathname: string): string[] | null {
  const segments = readSegments(pathname)
  if (!segments || segments.some((segment) => !segment.canonical)) return null
  return segments.map((segment) => segment.text)
}

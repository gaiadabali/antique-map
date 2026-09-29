/**
 * @contract C10 — the route map: a public path's segments, read strictly · owner: ARC · entry: `@engine/config/routes`
 *
 * `href()` writes every segment one way — `encodeURIComponent` of its text — so a path is read
 * only in that spelling: a segment that does not survive decode-then-encode is no address of
 * any page (`/pr%6Fduct/1706` would otherwise serve the item at a second URL with a 200, 3.1
 * senior-fe #13). Nor is one that decodes to a `/`: `%2F` would join two segments into one, a
 * second spelling of a named browse path. Pure.
 */

/**
 * The path's segments decoded, empty ones skipped — or `null` when one is not in `href()`'s
 * spelling: undecodable (`%E0%A4%A`), decoding to a `/`, or written another way than
 * `encodeURIComponent` writes it (`%6F` for `o`, a lower-case `%c3%a9`, a raw `,`).
 */
export function decodeSegments(pathname: string): string[] | null {
  const segments: string[] = []
  for (const raw of pathname.split('/')) {
    if (raw === '') continue
    let text: string
    try {
      text = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (text.includes('/') || encodeURIComponent(text) !== raw) return null
    segments.push(text)
  }
  return segments
}

/**
 * The item route's one-address rule (MIGRATION.md §6, C10; the 4.1.e spike), kept apart from the
 * spike's fixtures so the item surface (phase 33) inherits it rather than deleting it.
 *
 * - **Only the id is read from the `{publicId}-{slug}` segment.** Its digits spell the same encoded
 *   or not; the slug part does not — Next 16.3.6 hands the page the segment still percent-encoded
 *   and `generateMetadata` the same segment decoded once — so no spelling of the param is compared,
 *   and nothing is decoded a second time (which would make `b%61li` a second 200 address).
 * - **The address is canonical when the public path the proxy passed on is, byte for byte, the one
 *   `href()` spells.** Anything else answers one permanent redirect to it: an old link's slug, an
 *   encoded or odd spelling, a missing slug.
 * - **The redirect carries the item's public query on** (C13 `PROXY_REQUEST_HEADERS.publicSearch`,
 *   which the proxy sets on the item route's rewrite alone, `''` when there is none), so a stale
 *   slug's 308 keeps an old link's `utm_*` or an ad's click id (TASKS.md 5.3). It is read from the
 *   request header, never `searchParams` — the rewrite replaced the query with the canonical
 *   state's — and it never decides whether the address is canonical: only the path does, so
 *   `/product/1726-bali?utm_source=x` is a 200, not a redirect to itself.
 */

/** The public id, or `null` when the segment names none (a leading zero, no digits, too large). */
export function parsePublicId(segment: string): number | null {
  const match = /^([1-9]\d*)(?:-|$)/.exec(segment)
  const publicId = Number(match?.[1])
  return match && Number.isSafeInteger(publicId) ? publicId : null
}

export class MissingPublicPathError extends Error {
  override readonly name = 'MissingPublicPathError'
}

/**
 * `null` when `publicPath` is the canonical address; otherwise the address to redirect to. A
 * request with no public path did not come through the proxy (C13 `PROXY_REQUEST_HEADERS`), so the
 * route cannot tell which address was asked for: it refuses (senior-fe #10), never redirecting the
 * canonical address to itself in a loop.
 */
export function canonicalRedirect(
  publicPath: string | null,
  canonical: string,
  publicSearch: string | null = '',
): string | null {
  if (publicPath === null || publicPath === '') {
    throw new MissingPublicPathError('the proxy passed no x-public-path: the request bypassed it')
  }
  return publicPath === canonical ? null : `${canonical}${carriedQuery(publicSearch)}`
}

/**
 * The query a redirect carries: `URL.search` as the proxy copied it — `?` and printable ASCII, a
 * WHATWG serialisation being percent-encoded — or nothing. Anything else did not come from the
 * proxy's `URL.search` (no fragment, no space, no control character), so it is dropped rather
 * than written into a `Location`.
 */
function carriedQuery(publicSearch: string | null): string {
  // `?`, then printable ASCII but `#` (0x21–0x7e without 0x23).
  return publicSearch !== null && /^\?[\x21\x22\x24-\x7e]+$/.test(publicSearch) ? publicSearch : ''
}

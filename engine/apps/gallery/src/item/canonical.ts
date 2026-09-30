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
export function canonicalRedirect(publicPath: string | null, canonical: string): string | null {
  if (publicPath === null || publicPath === '') {
    throw new MissingPublicPathError('the proxy passed no x-public-path: the request bypassed it')
  }
  return publicPath === canonical ? null : canonical
}

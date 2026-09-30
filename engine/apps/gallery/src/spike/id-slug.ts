/**
 * The id in the item route's `{publicId}-{slug}` segment. Only the id is read from it: its digits
 * spell the same encoded or not, while the slug part does not — Next 16.3.6 hands the page the
 * segment percent-encoded and `generateMetadata` the same segment decoded once (the 4.1.e spike).
 * Whether the address is the canonical one is decided from the public path instead (the page).
 */
export function parsePublicId(segment: string): number | null {
  const match = /^([1-9]\d*)(?:-|$)/.exec(segment)
  const publicId = Number(match?.[1])
  return match && Number.isSafeInteger(publicId) ? publicId : null
}

/**
 * What of a brand's public media bucket the public may read (TASKS.md 8.3.g; 6.2.e's Found 11).
 *
 * The bucket is "public" only under two prefixes: the derivative ladder (C9 `derivativeKey()`) and
 * the capped IIIF tiles (C9 `iiifPublicKey()`). Everything else in it — above all the file an
 * editor uploaded to a `media` record, which lands under `UPLOADS_PREFIX` — is private: an upload
 * is the full-resolution processed image, so serving it would bypass the brand's
 * `media.publicZoomMaxPx` cap (C1), and it may still carry the camera's metadata — GPS, serial
 * numbers, editing history — which nothing public may (intake-spec.md §9.3, F6). The derivative
 * and tile jobs (TASKS.md 15.1, 15.2) write their output without that metadata.
 *
 * The anonymous-read policy applied to every media bucket (`policies/media-public-read.json`)
 * grants exactly `PUBLIC_MEDIA_PREFIXES`; a test holds the policy file to this list.
 */

/**
 * Where every upload collection's files land in the brand bucket (the storage plugin's collection
 * prefix, `@engine/cms` `registries/storage.ts`). The same for every brand and environment, so the
 * `prefix` column's default — written into the DDL — never differs between two databases.
 */
export const UPLOADS_PREFIX = 'uploads'

/** The only key prefixes of a media bucket an anonymous request may read. */
export const PUBLIC_MEDIA_PREFIXES = ['derivatives/', 'iiif/'] as const
export type PublicMediaPrefix = (typeof PUBLIC_MEDIA_PREFIXES)[number]

/** Whether `key` is one the public may read from a media bucket: a derivative or a capped tile. */
export function isPublicMediaKey(key: string): boolean {
  if (key.startsWith('/') || key.split('/').some((segment) => segment === '..' || segment === '')) {
    return false
  }
  return PUBLIC_MEDIA_PREFIXES.some(
    (prefix) => key.startsWith(prefix) && key.length > prefix.length,
  )
}

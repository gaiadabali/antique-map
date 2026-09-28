/**
 * @contract C9 — media artefacts · owner: ARC · consumers: MED, WEB, UXG, UXE, MIG, SIS, LOG
 *
 * What every image artefact is called and where it lives (ARCHITECTURE.md §7). The brand's
 * public bucket (`MEDIA_BUCKET`, behind the CDN, public URL `MEDIA_PUBLIC_URL`) holds the
 * derivatives and the capped IIIF tiles; the shared private bucket (`MASTERS_BUCKET`) holds
 * masters, print files and the uncapped zoom pyramid. Buckets and hosts come from the
 * environment, never from code. Public keys are content-addressed and versioned, so they
 * are cached immutably: a changed image is a new key, never a stale one. View models carry
 * resolved URLs built with these functions (C2); no component builds a media URL.
 */

/** A content address: the first 32 hex characters of the source file's SHA-256. */
export type AssetId = string
export const ASSET_ID_PATTERN = /^[0-9a-f]{32}$/

// ── Derivatives (public) ───────────────────────────────────────────────────────────────

/** Bumped whenever the pipeline's output changes, so old keys are never overwritten. */
export const DERIVATIVE_VERSION = 'v1'
/** The width ladder, in px, each in every format; the image loader picks from it. */
export const DERIVATIVE_WIDTHS = [320, 640, 1024, 1600, 2400] as const
export type DerivativeWidth = (typeof DERIVATIVE_WIDTHS)[number]
export const DERIVATIVE_FORMATS = ['avif', 'webp'] as const
export type DerivativeFormat = (typeof DERIVATIVE_FORMATS)[number]
/** Under `Save-Data: on` no wider derivative is served (DESIGN-SYSTEM.md §7). */
export const SAVE_DATA_MAX_WIDTH: DerivativeWidth = 1024
/** The blur placeholder: a WebP at most this wide, inlined on the media record as a data URI. */
export const BLUR_MAX_WIDTH = 32

/** `derivatives/v1/<assetId>/<width>.<format>` in the public bucket. */
export function derivativeKey(id: AssetId, width: DerivativeWidth, format: DerivativeFormat) {
  return `derivatives/${DERIVATIVE_VERSION}/${id}/${width}.${format}`
}

// ── Deep zoom (IIIF Image API 3, Level 0 static tiles) ─────────────────────────────────

export const IIIF_TILE_SIZE = 512
/**
 * Public tiles stop at the brand's `media.publicZoomMaxPx` long edge (C1); the uncapped
 * pyramid goes to the private prefix, because Level 0 tile paths are predictable and a
 * signed manifest over public full-resolution tiles would protect nothing.
 */
export function iiifPublicKey(id: AssetId) {
  return `iiif/${id}`
}
/** In the private bucket; served only through `MEDIA_ROUTES.fullTiles` to staff. */
export function iiifFullKey(brand: string, id: AssetId) {
  return `iiif-full/${brand}/${id}`
}
/** Each `info.json` `id` is its final public URL, and the bucket's CORS allows the viewer. */
export function iiifInfoUrl(mediaPublicUrl: string, id: AssetId) {
  return `${mediaPublicUrl}/${iiifPublicKey(id)}/info.json`
}

/** Engine routes (C13 `/api/x/media/[...path]`): Presentation 3 manifests and full tiles. */
export const MEDIA_ROUTES = {
  /** Public, cached by tag: the work's images ordered by `IMAGE_ROLES`, labels localised. */
  manifest: (workUid: string) => `/api/x/media/manifest/${encodeURIComponent(workUid)}`,
  /** Staff only: the same manifest over the uncapped pyramid. */
  fullManifest: (workUid: string) => `/api/x/media/manifest/${encodeURIComponent(workUid)}/full`,
  /** Staff only: streams `iiifFullKey()` from the private bucket. */
  fullTiles: (id: AssetId) => `/api/x/media/full/${id}`,
} as const

// ── Masters and print files (private) ──────────────────────────────────────────────────

/** A master scan, written once by the origin brand; sister copies reference this key (C12). */
export function masterKey(workUid: string, checksum: string, extension: string) {
  return `masters/${workUid}/${checksum}.${extension}`
}
/** The only prefix an outlet brand's storage key may write (a MinIO/R2 policy, tested). */
export const PRINT_FILES_PREFIX = 'print-files/'
/** A colour-managed, cropped design file for reproduction. */
export function printFileKey(brand: string, designUid: string, checksum: string, ext: string) {
  return `${PRINT_FILES_PREFIX}${brand}/${designUid}/${checksum}.${ext}`
}

/**
 * Presigned URL lifetimes, in seconds. Masters go straight to the bucket (a large TIFF
 * exceeds the CDN's request limit in front of `/admin`); every read is logged. Production
 * partners get URLs that outlive their fetch window: the SigV4 maximum, seven days.
 */
export const PRESIGN_TTL_SECONDS = {
  masterUpload: 60 * 60,
  staffRead: 15 * 60,
  partnerFetch: 7 * 24 * 60 * 60,
} as const

/** The default minimum print resolution (D26); a product type may raise it. */
export const MIN_PRINT_PPI = 240
/** The longest print a long edge supports, to the nearest mm: 3543 px at 240 ppi → 375 mm. */
export function printCeilingMm(longEdgePx: number, ppi: number = MIN_PRINT_PPI): number {
  return Math.round((longEdgePx / ppi) * 25.4)
}

// ── Image roles ────────────────────────────────────────────────────────────────────────

/** A work's image roles (CONTENT-MODEL.md §1), in manifest and filmstrip order. */
export const IMAGE_ROLES = [
  'primary',
  'recto',
  'verso',
  'detail',
  'raking',
  'transmitted',
  'framed',
  'in-room',
  'scale',
] as const
export type ImageRole = (typeof IMAGE_ROLES)[number]

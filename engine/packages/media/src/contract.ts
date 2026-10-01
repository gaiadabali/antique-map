/**
 * @contract C9 — media artefacts · owner: ARC · consumers: MED, WEB, UXG, UXE, MIG, SIS, LOG, SCH, ADM
 *
 * What every image artefact is called and where it lives (ARCHITECTURE.md §7, DEPLOYMENT.md §2).
 * Each brand has its own media bucket (`S3_BUCKET`), public only under `derivatives/` and `iiif/`
 * — the derivative ladder and the capped IIIF tiles, behind the CDN at `MEDIA_PUBLIC_URL` — and
 * private everywhere else: its uploads (`uploads/`, the storage plugin's prefix) and its uncapped
 * zoom pyramid (`iiif-full/`). The shared private bucket (`MASTERS_BUCKET`) holds masters and
 * print files. Buckets and hosts come from the environment, never from code. Public keys are
 * content-addressed and versioned, so they are cached immutably: a changed image is a new key,
 * never a stale one. View models carry resolved URLs built with these functions (C2); no
 * component builds a media URL.
 *
 * The parts: this file names the keys; `./contract/roles` what an image is and how it was
 * made (its role and provenance, and which image leads a page); `./contract/masters` what the
 * intake measures on a capture and the print ceiling; `./contract/room-plates` the
 * configurator's shared room plates (docs/design/imagery/, TASKS.md 6.2.e).
 */
export * from './contract/masters'
export * from './contract/roles'
export * from './contract/room-plates'

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
/**
 * The uncapped pyramid, in the brand's own media bucket under the private `iiif-full/` prefix —
 * both brands alike, each writing its own with its media key (v1.6; v1.4 named the masters
 * bucket, where an outlet's key writes only its print files). The bucket's public policy names
 * `iiif/` with its slash, so nothing under `iiif-full/` is public; it is served only through
 * `MEDIA_ROUTES.fullTiles`, to staff. The key is v1.1's, unchanged: in a brand's own bucket its
 * `brand` segment is always that brand's slug.
 */
export function iiifFullKey(brand: string, id: AssetId) {
  return `iiif-full/${brand}/${id}`
}
/** Each `info.json` `id` is its final public URL, and the bucket's CORS allows the viewer. */
export function iiifInfoUrl(mediaPublicUrl: string, id: AssetId) {
  return `${mediaPublicUrl}/${iiifPublicKey(id)}/info.json`
}

/** Engine routes (C13 `/api/x/media/[...path]`): Presentation 3 manifests and full tiles. */
export const MEDIA_ROUTES = {
  /** Public, cached by tag: the work's images in `orderImages('work', …)` order, labels localised. */
  manifest: (workUid: string) => `/api/x/media/manifest/${encodeURIComponent(workUid)}`,
  /** Staff only: the same manifest over the uncapped pyramid. */
  fullManifest: (workUid: string) => `/api/x/media/manifest/${encodeURIComponent(workUid)}/full`,
  /** Staff only: streams `iiifFullKey()` from the brand's own media bucket. */
  fullTiles: (id: AssetId) => `/api/x/media/full/${id}`,
} as const

// ── Masters and print files (private) ──────────────────────────────────────────────────

/**
 * A work's capture, written once by the origin brand; sister copies reference this key (C12).
 * `checksum` is the file's SHA-256 as 64 lower-case hex digits, as `intakeMasterKey()` checks.
 */
export function masterKey(workUid: string, checksum: string, extension: string) {
  return `masters/${workUid}/${checksum}.${extension}`
}

/** Where a capture lands that has no work to be filed under yet — or never will. */
export const INTAKE_MASTERS_PREFIX = 'masters/intake/'
const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA256_HEX = /^[0-9a-f]{64}$/
const EXTENSION = /^[a-z0-9]{1,8}$/

function kebabSegment(value: string, what: string): string {
  if (value.length > 64 || !KEBAB_ID.test(value)) {
    throw new Error(`${what} must be a kebab-case id of at most 64 characters, not "${value}"`)
  }
  return value
}

/**
 * A capture received before its work exists — the owner's pilot set (TASKS.md 6.2.b, OA3), a
 * migration batch not yet loaded — or whose subject is no work: a showroom photograph, a room
 * plate's master. `brand` is the slug of the brand whose subject it is, `batch` the handover it
 * came in (`pilot-2026-10`), `checksum` the SHA-256 of the file as received. Written, like every
 * `masters/` key, with the origin's credentials: an outlet writes only its own print files.
 *
 * A work's capture is FILED once its work exists — copied to `masterKey(workUid, …)`, the copy
 * verified by its checksum, the record re-pointed, the intake object deleted: the one move a
 * master ever makes, so every master a work names lives under its uid and a C12 snapshot names a
 * `masterKey()`. A capture of anything else keeps its intake key. Throws on a segment that is not
 * a kebab-case id, a checksum that is not 64 lower-case hex digits, or an extension that is not 1–8
 * lower-case letters or digits — never a path a caller could steer outside its batch.
 */
export function intakeMasterKey(brand: string, batch: string, checksum: string, extension: string) {
  if (!SHA256_HEX.test(checksum)) {
    throw new Error(`checksum must be a SHA-256 in 64 lower-case hex digits, not "${checksum}"`)
  }
  if (!EXTENSION.test(extension)) {
    throw new Error(`extension must be 1–8 lower-case letters or digits, not "${extension}"`)
  }
  return `${intakeBatchPrefix(brand, batch)}${checksum}.${extension}`
}

/** The batch's record of what was received and judged (`IntakeManifest`), kept beside its files. */
export function intakeManifestKey(brand: string, batch: string) {
  return `${intakeBatchPrefix(brand, batch)}intake.json`
}

function intakeBatchPrefix(brand: string, batch: string) {
  return `${INTAKE_MASTERS_PREFIX}${kebabSegment(brand, 'brand')}/${kebabSegment(batch, 'batch')}/`
}

/**
 * Where print files live, and all an outlet brand's masters key may write: under its own slug,
 * `printFileKey(<its slug>, …)`, and nowhere else (the storage policy, tested; DEPLOYMENT.md §2).
 */
export const PRINT_FILES_PREFIX = 'print-files/'
/** A colour-managed, cropped design file for reproduction, under the brand that made it. */
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

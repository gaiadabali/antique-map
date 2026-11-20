/**
 * Upload size limits and allowed types (TASKS.md 8.3.d), for the two ways a file enters storage:
 *
 * - **A `media` upload** goes through the app server — the admin's upload form, Payload's REST
 *   API — so it must fit under the CDN's request-body limit in front of `/admin` (Cloudflare's
 *   100 MB, ARCHITECTURE.md §7), with room for the multipart envelope. It is a *processed* image
 *   (CONTENT-MODEL.md §6): a web-renderable raster the derivatives and tiles are made from — or a
 *   web video (MP4, WebM) or a PDF that a shop page plays or links, served as it is, never
 *   processed. Never a RAW or a TIFF, and never SVG or HTML, documents that can carry script.
 * - **A master** never touches the app server: it is PUT straight to the private bucket by a
 *   presigned URL whose signature covers its length and its SHA-256 (`./masters-store`), so the
 *   storage itself refuses a larger file or other bytes. Its cap is the largest single PUT S3
 *   accepts. The types are what the owner may hand over (handover.md: RAW, TIFF, JPEG, HEIC, PNG,
 *   a scanner's PDF) for a capture. The configurator's print files went with it (TASKS.md 2.4.b).
 */
import type { MasterKind } from './master-kinds'

const MiB = 1024 * 1024

/** A `media` upload: under Cloudflare's 100 MB body limit with ~5 MB to spare for the envelope. */
export const MEDIA_UPLOAD_MAX_BYTES = 90 * MiB

/**
 * The images a `media` upload may be, by the type sniffed from its bytes (Payload checks both).
 * Not TIFF: a processed web image is one of these four, and file-type sniffs DNG and most camera
 * RAW files as TIFF — those are captures, and belong in masters. Only these go through the
 * derivative pipeline.
 */
export const MEDIA_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/** The videos a shop page plays: the two every current browser plays without a plug-in. */
export const MEDIA_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const

/** The documents a shop page links: PDF only — never HTML or SVG, which can carry script. */
export const MEDIA_DOCUMENT_MIME_TYPES = ['application/pdf'] as const

/** Everything a `media` upload may be: the images, then the files served as they are. */
export const MEDIA_UPLOAD_MIME_TYPES = [
  ...MEDIA_IMAGE_MIME_TYPES,
  ...MEDIA_VIDEO_MIME_TYPES,
  ...MEDIA_DOCUMENT_MIME_TYPES,
] as const

/** A PDF: a brochure or a price list, never a scanned book — a phone opens it on mobile data. */
export const MEDIA_PDF_MAX_BYTES = 20 * MiB

/** What a `media` record is, from its type: what the admin lists and image relations filter by. */
export const MEDIA_KINDS = ['image', 'video', 'pdf'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

const essence = (mimeType: string) => mimeType.split(';')[0]!.trim().toLowerCase()
const isOneOf = (list: readonly string[], value: string) => list.includes(value)

/** The kind a mime type is, or null for a type no `media` upload may be. */
export function mediaKindOf(mimeType: unknown): MediaKind | null {
  if (typeof mimeType !== 'string') return null
  const type = essence(mimeType)
  if (isOneOf(MEDIA_IMAGE_MIME_TYPES, type)) return 'image'
  if (isOneOf(MEDIA_VIDEO_MIME_TYPES, type)) return 'video'
  if (isOneOf(MEDIA_DOCUMENT_MIME_TYPES, type)) return 'pdf'
  return null
}

/**
 * Whether a file's first bytes are what its declared type says. Payload checks a file's sniffed
 * type against the allowed list, but keeps the *declared* type of anything that is not an image —
 * so a PDF sent as `video/mp4` would be stored, and served, as a video, and dodge the PDF limit.
 * A PDF starts `%PDF-`, an MP4 has `ftyp` at byte 4, a WebM starts with the EBML magic number.
 * Images are Payload's: it stores the type it sniffed.
 */
export function bytesMatchType(head: Uint8Array, mimeType: string): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to))
  switch (essence(mimeType)) {
    case 'application/pdf':
      return ascii(0, 5) === '%PDF-'
    case 'video/mp4':
      return ascii(4, 8) === 'ftyp'
    case 'video/webm':
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3
    default:
      return true
  }
}

/** A master: S3's largest single PUT, 5 GiB — a 16-bit TIFF of a metre-wide sheet fits. */
export const MASTER_UPLOAD_MAX_BYTES = 5 * 1024 * MiB

const RAW: Record<string, string> = {
  cr2: 'image/x-canon-cr2',
  cr3: 'image/x-canon-cr3',
  nef: 'image/x-nikon-nef',
  arw: 'image/x-sony-arw',
  raf: 'image/x-fuji-raf',
  orf: 'image/x-olympus-orf',
  rw2: 'image/x-panasonic-rw2',
  dng: 'image/x-adobe-dng',
}
const RASTER: Record<string, string> = {
  tif: 'image/tiff',
  tiff: 'image/tiff',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

/** Each kind's allowed extensions, with the content type its presigned PUT is signed for. */
export const MASTER_TYPES: Readonly<Record<MasterKind, Readonly<Record<string, string>>>> = {
  capture: { ...RAW, ...RASTER, heic: 'image/heic', pdf: 'application/pdf' },
}

/** The content type a master of this kind and extension is stored under, or null if refused. */
export function masterContentType(kind: MasterKind, extension: string): string | null {
  return Object.hasOwn(MASTER_TYPES[kind], extension) ? MASTER_TYPES[kind][extension]! : null
}

/** Why a master upload is refused — each in a sentence the admin can show — or none. */
export function masterUploadProblems(input: {
  readonly kind: MasterKind
  readonly extension: string
  readonly byteSize: number
}): string[] {
  const problems: string[] = []
  if (masterContentType(input.kind, input.extension) === null) {
    const allowed = Object.keys(MASTER_TYPES[input.kind]).join(', ')
    problems.push(`A ${input.kind} cannot be a .${input.extension} file: send one of ${allowed}.`)
  }
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1) {
    problems.push('The file size must be a whole number of bytes, above zero.')
  } else if (input.byteSize > MASTER_UPLOAD_MAX_BYTES) {
    problems.push(
      `The file is ${formatBytes(input.byteSize)}; a master may be at most ${formatBytes(MASTER_UPLOAD_MAX_BYTES)}.`,
    )
  }
  return problems
}

/** `94.4 MB` — decimal megabytes, as people and the CDN count them. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} kB`
  return `${bytes} bytes`
}

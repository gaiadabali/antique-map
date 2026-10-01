/**
 * Upload size limits and allowed types (TASKS.md 8.3.d), for the two ways a file enters storage:
 *
 * - **A `media` upload** goes through the app server — the admin's upload form, Payload's REST
 *   API — so it must fit under the CDN's request-body limit in front of `/admin` (Cloudflare's
 *   100 MB, ARCHITECTURE.md §7), with room for the multipart envelope. It is the *processed*
 *   image (CONTENT-MODEL.md §6): a web-renderable raster the derivatives and tiles are made from,
 *   never a RAW, never a PDF and never an SVG, which is a document that can carry script.
 * - **A master** never touches the app server: it is PUT straight to the private bucket by a
 *   presigned URL whose signature covers its length and its SHA-256 (`./masters-store`), so the
 *   storage itself refuses a larger file or other bytes. Its cap is the largest single PUT S3
 *   accepts. The types are what the owner may hand over (handover.md: RAW, TIFF, JPEG, HEIC, PNG,
 *   a scanner's PDF) for a capture, and what a print partner takes for a print file.
 */
import type { MasterKind } from './master-kinds'

const MiB = 1024 * 1024

/** A `media` upload: under Cloudflare's 100 MB body limit with ~5 MB to spare for the envelope. */
export const MEDIA_UPLOAD_MAX_BYTES = 90 * MiB

/** What a `media` upload may be, by the type sniffed from its bytes (Payload checks both). */
export const MEDIA_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
] as const

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
  'print-file': { ...RASTER, pdf: 'application/pdf' },
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

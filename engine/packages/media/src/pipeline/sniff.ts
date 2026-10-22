/**
 * What a stored upload is, read from its first bytes (SECURITY.md F1): never its file name, its
 * extension or the `Content-Type` it was sent or stored with. The pipeline re-reads the upload
 * from the bucket, so it sniffs again rather than trusting what Payload sniffed on the way in —
 * sharp would decode a TIFF, a GIF or an SVG just as happily, and none of them is a `media` image
 * (`../storage` `MEDIA_UPLOAD_MIME_TYPES`).
 */
import type { MEDIA_UPLOAD_MIME_TYPES } from '../storage/limits'

export type MediaImageType = (typeof MEDIA_UPLOAD_MIME_TYPES)[number]

const startsWith = (bytes: Uint8Array, at: number, signature: readonly number[]) =>
  bytes.length >= at + signature.length && signature.every((byte, i) => bytes[at + i] === byte)

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** ISO-BMFF brands that declare AVIF still images or sequences. */
const AVIF_BRANDS = new Set(['avif', 'avis'])

function isAvif(bytes: Uint8Array): boolean {
  if (!startsWith(bytes, 4, ascii('ftyp'))) return false
  const boxSize = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0
  const end = Math.min(boxSize, bytes.length, 256)
  if (boxSize < 16 || end < 16) return false
  const brand = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))
  // The major brand at 8, then the compatible brands after the minor version (at 16).
  if (AVIF_BRANDS.has(brand(8))) return true
  for (let at = 16; at + 4 <= end; at += 4) if (AVIF_BRANDS.has(brand(at))) return true
  return false
}

/** The image type the bytes are, or null for anything a `media` record may not hold. */
export function sniffImageType(bytes: Uint8Array): MediaImageType | null {
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, 0, ascii('RIFF')) && startsWith(bytes, 8, ascii('WEBP'))) {
    return 'image/webp'
  }
  if (isAvif(bytes)) return 'image/avif'
  return null
}

/** sharp's `metadata().format` for each type — AVIF reads as its HEIF container. */
export const SHARP_FORMAT: Readonly<Record<MediaImageType, string>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'heif',
}

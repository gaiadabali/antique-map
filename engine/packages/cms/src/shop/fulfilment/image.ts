/**
 * Checking and re-encoding the driver's details (COMMERCE.md §9; SECURITY.md F1–F3).
 *
 * - **The type comes from the bytes** — the file's magic number — never its name or the
 *   `Content-Type` the phone sent: a renamed `.exe` or a text file is `not_an_image`. JPEG, PNG and
 *   WebP only; an SVG (a document that can carry script) or anything else is refused.
 * - **The size is the bytes received**, not a declared size: at most 10 MB, and not empty.
 * - **Re-encoded** by `sharp` (through `@engine/media/derivatives`, the one package that carries
 *   it): decoded, turned upright by its EXIF orientation, every metadata block dropped — the GPS a
 *   phone photo carries included — scaled to at most 1600 px on the long edge, written as WebP.
 *   What is stored is what sharp wrote, never the bytes uploaded.
 */
import { makeDerivatives, type Derivative } from '@engine/media/derivatives'

export type SniffedType = 'image/jpeg' | 'image/png' | 'image/webp'

const startsWith = (bytes: Uint8Array, at: number, signature: readonly number[]) =>
  bytes.length >= at + signature.length && signature.every((byte, i) => bytes[at + i] === byte)

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

/** The image type the bytes are, or null for anything else. */
export function sniffImageType(bytes: Uint8Array): SniffedType | null {
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, 0, ascii('RIFF')) && startsWith(bytes, 8, ascii('WEBP'))) {
    return 'image/webp'
  }
  return null
}

export type UploadCheck =
  | { readonly ok: true; readonly type: SniffedType }
  | { readonly ok: false; readonly refusal: 'empty_file' | 'too_large' | 'not_an_image' }

/** The size and type checks, on the bytes alone. */
export function checkUpload(bytes: Uint8Array, maxBytes: number): UploadCheck {
  if (bytes.byteLength === 0) return { ok: false, refusal: 'empty_file' }
  if (bytes.byteLength > maxBytes) return { ok: false, refusal: 'too_large' }
  const type = sniffImageType(bytes)
  return type === null ? { ok: false, refusal: 'not_an_image' } : { ok: true, type }
}

export type Reencoded = {
  readonly bytes: Uint8Array
  readonly contentType: string
  readonly width: number
  readonly height: number
}

/** Decodes and re-encodes an image to at most `maxEdge` px; throws when the bytes do not decode. */
export type Reencoder = (bytes: Uint8Array, maxEdge: number) => Promise<Reencoded>

const webps = (rendered: readonly Derivative[]) =>
  rendered.filter((d) => d.format === 'webp').sort((a, b) => b.width - a.width)
const asReencoded = (d: Derivative): Reencoded => ({
  bytes: d.bytes,
  contentType: 'image/webp',
  width: d.width,
  height: d.height,
})

/**
 * The default re-encoder, on `makeDerivatives`: its ladder always includes the source width, so
 * asking for `maxEdge` gives a landscape image's final size in one pass; a portrait image taller
 * than `maxEdge` takes a second pass at the width that brings its height down to it.
 */
export const reencodeImage: Reencoder = async (bytes, maxEdge) => {
  const first = webps(await makeDerivatives(Buffer.from(bytes), { widths: [maxEdge] }))
  const fits = first.find((d) => Math.max(d.width, d.height) <= maxEdge)
  if (fits) return asReencoded(fits)
  const full = first[0]
  if (!full) throw new Error('fulfilment: sharp rendered no WebP')
  const width = Math.max(1, Math.floor((full.width * maxEdge) / full.height))
  const second = webps(await makeDerivatives(full.bytes, { widths: [width] }))
  const resized = second.find((d) => Math.max(d.width, d.height) <= maxEdge)
  if (!resized) throw new Error('fulfilment: could not bring the image under the size limit')
  return asReencoded(resized)
}

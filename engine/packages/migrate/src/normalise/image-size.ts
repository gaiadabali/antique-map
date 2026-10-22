/**
 * The pixel size of a JPEG or PNG, read from its header — the evidence
 * `orientation.ts` uses to tell height from width. An EXIF orientation of 5–8
 * (a camera's "rotate 90°") swaps the sides, as a viewer would.
 */
import { closeSync, openSync, readSync } from 'node:fs'

export type ImageSize = { readonly widthPx: number; readonly heightPx: number }

const HEADER_BYTES = 1 << 20

export function readImageSize(path: string): ImageSize | null {
  const descriptor = openSync(path, 'r')
  try {
    const buffer = Buffer.alloc(HEADER_BYTES)
    const length = readSync(descriptor, buffer, 0, buffer.length, 0)
    return imageSizeOf(buffer.subarray(0, length))
  } finally {
    closeSync(descriptor)
  }
}

export function imageSizeOf(bytes: Buffer): ImageSize | null {
  if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { widthPx: bytes.readUInt32BE(16), heightPx: bytes.readUInt32BE(20) }
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let rotated = false
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xff) {
      offset += 1
      continue
    }
    const length = bytes.readUInt16BE(offset + 2)
    if (marker === 0xe1 && bytes.toString('ascii', offset + 4, offset + 8) === 'Exif') {
      rotated = exifOrientation(bytes, offset + 10) >= 5
    }
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isFrame) {
      const heightPx = bytes.readUInt16BE(offset + 5)
      const widthPx = bytes.readUInt16BE(offset + 7)
      return rotated ? { widthPx: heightPx, heightPx: widthPx } : { widthPx, heightPx }
    }
    offset += 2 + length
  }
  return null
}

/** The TIFF orientation tag (0x0112) of an EXIF block starting at `tiff`; 1 when absent. */
function exifOrientation(bytes: Buffer, tiff: number): number {
  if (tiff + 8 > bytes.length) return 1
  const little = bytes.toString('ascii', tiff, tiff + 2) === 'II'
  const u16 = (at: number) => (little ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at))
  const u32 = (at: number) => (little ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at))
  const directory = tiff + u32(tiff + 4)
  if (directory + 2 > bytes.length) return 1
  const entries = u16(directory)
  for (let entry = 0; entry < entries; entry++) {
    const at = directory + 2 + entry * 12
    if (at + 10 > bytes.length) return 1
    if (u16(at) === 0x0112) return u16(at + 8)
  }
  return 1
}

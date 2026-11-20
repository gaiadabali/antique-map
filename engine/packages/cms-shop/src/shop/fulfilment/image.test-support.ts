/**
 * Test support only — image bytes for the fulfilment tests, made without sharp (which `@engine/cms`
 * does not depend on): a plain PNG of any size, written chunk by chunk with `node:zlib`, and the
 * real phone-style JPEG the media tests use, with its camera and GPS Exif.
 */
import { crc32, deflateSync } from 'node:zlib'

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A grey 8-bit RGB PNG, `width` × `height`. */
export function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8) // bit depth 8, RGB, deflate, no filter set, no interlace
  const row = Buffer.alloc(1 + width * 3, 0x80)
  row[0] = 0 // filter: none
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * A real 16 × 12 JPEG with the Exif a phone writes: camera "TestCam" / "Phone 1" and a GPS position
 * (8° 39′ S, 115° 13′ E) — the fixture of `collections/media/test-stack.test-support`.
 */
export const EXIF_JPEG = Buffer.from(
  '/9j/4QFWRXhpZgAASUkqAAgAAAAJAA8BAgAIAAAAigAAABABAgAIAAAAkgAAABIBAwABAAAAAQAAABoBBQABAAAAegAAABsBBQABAAAAggAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAmgAAACWIBAABAAAA6AAAAAAAAAA4YwAA6AMAADhjAADoAwAAVGVzdENhbQBQaG9uZSAxAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAAQAAAAA6AEAAEAAAAMAAAAAAAAAAQAAQACAAIAAABTAAAAAgAFAAMAAAAeAQAAAwACAAIAAABFAAAABAAFAAMAAAA2AQAAAAAAAAgAAAABAAAAJwAAAAEAAAAAAAAAAQAAAHMAAAABAAAADQAAAAEAAAAAAAAAAQAAAP/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIAAwAEAMBIgACEQEDEQH/xAAVAAEBAAAAAAAAAAAAAAAAAAAABP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAE/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AtABJf//Z',
  'base64',
)

/** A Windows executable's first bytes ("MZ"…), as a renamed `driver.jpg.exe` would carry. */
export const EXE = Buffer.concat([
  Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1'),
  Buffer.alloc(120),
])

/** A text file saying it is a picture. */
export const TEXT = Buffer.from('This is not a picture, it only says so: driver.png\n', 'utf8')

/** An SVG: a document that can carry script — refused even though browsers show it as an image. */
export const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  'utf8',
)

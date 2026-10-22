import { describe, expect, it } from 'vitest'

import { parseDimensions, toMillimetres } from '../dimensions.ts'
import { imageSizeOf } from '../image-size.ts'
import { parseOrientation, toSizes } from '../orientation.ts'
import { DEFAULT_TABLES } from '../tables.ts'
import type { Measured, MeasuredDimensions } from '../types.ts'

const dims = (text: string | null) => parseDimensions(text, DEFAULT_TABLES)
const cm = (a: number, b: number): Measured => ({ sidesMm: [a, b], unit: 'cm' })
const mm = (a: number, b: number): Measured => ({ sidesMm: [a, b], unit: 'mm' })

describe('parseDimensions — whole millimetres, never inches', () => {
  it.each([
    ['45 by 38 cm', { image: cm(450, 380), sheet: null }],
    ['45 by 38 cm.', { image: cm(450, 380), sheet: null }],
    ['450 x 380 mm', { image: mm(450, 380), sheet: null }],
    ['23x17cm', { image: cm(230, 170), sheet: null }],
    ['160 X 240 mm', { image: mm(160, 240), sheet: null }],
    ['210 × 290 mm.', { image: mm(210, 290), sheet: null }],
    ['140 mm X 172 mm', { image: mm(140, 172), sheet: null }],
    ['36,5 by 28 cm.', { image: cm(365, 280), sheet: null }],
    ['24.5 by 15.5 cm', { image: cm(245, 155), sheet: null }],
    ['25 by 16 cm. (full sheet)', { image: null, sheet: cm(250, 160) }],
    ['31 by 23 cm (unframed)', { image: cm(310, 230), sheet: null }],
    [
      'Full sheet 36.5 by 27 cm. - Photograph 21,5 by 15,3 cm.',
      { image: cm(215, 153), sheet: cm(365, 270) },
    ],
    ['163 x 130 mm. / sheet: 198 x 325 mm.', { image: mm(163, 130), sheet: mm(198, 325) }],
  ])('reads %j', (text, expected) => {
    const parsed = dims(text)
    expect(parsed.status).toBe('parsed')
    expect(parsed.value).toEqual(expected)
  })

  it.each([
    ['40 b7 22 cm.', 'b7', { image: cm(400, 220), sheet: null }],
    ['ca. 25 by 15 cm.', 'approximate', { image: cm(250, 150), sheet: null }],
    ['150 by 219 cm', 'no paper object', { image: cm(1500, 2190), sheet: null }],
    [
      '40 by 27 cm. / 26 by 21 cm.',
      'two measurements for the image',
      { image: cm(400, 270), sheet: null },
    ],
    ['47 by 27 cm. (each sheet)', 'unrecognised qualifier', { image: cm(470, 270), sheet: null }],
    [
      '463 x 261 mm. / Total over a 1.75m.',
      'unrecognised text',
      { image: mm(463, 261), sheet: null },
    ],
    ['245 by 168', 'no unit', null],
    ['24 cm by 168 mm', 'two different units', null],
    ['44.25 by 30 cm', 'fraction of a millimetre', null],
    ['Album', 'no measurement', null],
    ['18 x 15 in.', 'inches', null],
    ['18 by 15"', 'inches', null],
  ])('sends %j to review (%s) with its proposal', (text, reason, proposal) => {
    const parsed = dims(text)
    expect(parsed.status).toBe('review')
    expect(parsed.value).toBeNull()
    expect(parsed.reason).toContain(reason)
    expect(parsed.proposal).toEqual(proposal)
  })

  it('leaves an empty field empty', () => {
    expect(dims('').status).toBe('empty')
    expect(dims(null).status).toBe('empty')
  })

  it('converts without floating point: 44.2 cm is 442 mm, 0.1 + 0.2 never appears', () => {
    expect(toMillimetres('44.2', 'cm')).toBe(442)
    expect(toMillimetres('20.30', 'cm')).toBe(203)
    expect(toMillimetres('7.5', 'mm')).toBeNull()
  })
})

describe('parseOrientation — the photograph says which side is the height', () => {
  const landscapeSheet: MeasuredDimensions = { image: cm(450, 380), sheet: null }
  it('takes the orientation from the image, whatever order the numbers were typed in', () => {
    const portrait = { widthPx: 2000, heightPx: 2400 }
    expect(parseOrientation(landscapeSheet, portrait).value).toBe('portrait')
    expect(toSizes(landscapeSheet, 'portrait').image).toEqual({ heightMm: 450, widthMm: 380 })
    expect(toSizes({ image: cm(380, 450), sheet: null }, 'portrait').image).toEqual({
      heightMm: 450,
      widthMm: 380,
    })
    expect(toSizes(landscapeSheet, 'landscape').image).toEqual({ heightMm: 380, widthMm: 450 })
  })

  it('needs no image for equal sides', () => {
    expect(parseOrientation({ image: cm(170, 170), sheet: null }, null).value).toBe('square')
  })

  it.each([
    ['no image', null, 'no image'],
    ['a square image', { widthPx: 1000, heightPx: 1010 }, 'image is square'],
    ['an image of another shape', { widthPx: 1000, heightPx: 3000 }, 'proportions do not match'],
  ])('sends %s to review', (_case, image, reason) => {
    const parsed = parseOrientation(landscapeSheet, image)
    expect(parsed.status).toBe('review')
    expect(parsed.reason).toContain(reason)
  })
})

describe('imageSizeOf — pixels from a JPEG or PNG header', () => {
  const jpeg = (width: number, height: number, exifOrientation?: number) => {
    const parts = [Buffer.from([0xff, 0xd8])]
    if (exifOrientation !== undefined) {
      const tiff = Buffer.alloc(26)
      tiff.write('MM', 0, 'ascii')
      tiff.writeUInt16BE(42, 2)
      tiff.writeUInt32BE(8, 4)
      tiff.writeUInt16BE(1, 8)
      tiff.writeUInt16BE(0x0112, 10)
      tiff.writeUInt16BE(3, 12)
      tiff.writeUInt32BE(1, 14)
      tiff.writeUInt16BE(exifOrientation, 18)
      const header = Buffer.from([0xff, 0xe1, 0, 0])
      header.writeUInt16BE(2 + 6 + tiff.length, 2)
      parts.push(header, Buffer.from('Exif\0\0', 'binary'), tiff)
    }
    const frame = Buffer.from([0xff, 0xc0, 0, 11, 8, 0, 0, 0, 0, 1, 1, 0x11, 0])
    frame.writeUInt16BE(height, 5)
    frame.writeUInt16BE(width, 7)
    return Buffer.concat([...parts, frame, Buffer.alloc(16)])
  }

  it('reads a baseline JPEG frame, and swaps the sides for an EXIF quarter turn', () => {
    expect(imageSizeOf(jpeg(3543, 2840))).toEqual({ widthPx: 3543, heightPx: 2840 })
    expect(imageSizeOf(jpeg(3543, 2840, 6))).toEqual({ widthPx: 2840, heightPx: 3543 })
    expect(imageSizeOf(jpeg(3543, 2840, 1))).toEqual({ widthPx: 3543, heightPx: 2840 })
  })

  it('reads a PNG and refuses anything else', () => {
    const png = Buffer.alloc(32)
    png.writeUInt32BE(0x89504e47, 0)
    png.writeUInt32BE(640, 16)
    png.writeUInt32BE(480, 20)
    expect(imageSizeOf(png)).toEqual({ widthPx: 640, heightPx: 480 })
    expect(imageSizeOf(Buffer.from('not an image'))).toBeNull()
  })
})

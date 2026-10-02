/**
 * Derivative generation: the ladder never upscales, every width ships in AVIF and WebP,
 * and no derivative carries the source's metadata — a capture's EXIF GPS dies here
 * (TASKS.md 5.2.a, ARCHITECTURE.md §8).
 */
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { DERIVATIVE_FORMATS, DERIVATIVE_WIDTHS } from '../contract'
import { derivativeWidthsFor, isLowResolution, makeDerivatives } from './index'

const ID = '0123456789abcdef0123456789abcdef'

/** A small noisy JPEG with an EXIF GPS block, as a capture would arrive. */
async function gpsJpeg(width = 800, height = 600): Promise<Buffer> {
  const flat = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 30 },
    },
  })
    .jpeg()
    .toBuffer()
  const tagged = await sharp(flat)
    .withMetadata({ exif: { IFD3: { GPSLatitude: '1.2000', GPSLatitudeRef: 'N' } } })
    .jpeg()
    .toBuffer()
  expect((await sharp(tagged).metadata()).exif).toBeDefined()
  return tagged
}

describe('makeDerivatives', () => {
  it('never upscales a small image', async () => {
    const out = await makeDerivatives(await gpsJpeg(300, 200))
    expect(out.map((d) => d.width)).toEqual([300, 300])
    expect(out.every((d) => d.width <= 300 && d.height <= 200)).toBe(true)
    expect(out.map((d) => d.height)).toEqual([200, 200])
  })

  it('emits AVIF and WebP for each width', { timeout: 30_000 }, async () => {
    const out = await makeDerivatives(await gpsJpeg(2000, 1500))
    const widths = [...DERIVATIVE_WIDTHS.filter((w) => w <= 2000), 2000]
    expect(out.map((d) => d.width)).toEqual(widths.flatMap((w) => [w, w]))
    expect(out.map((d) => d.format)).toEqual(widths.flatMap(() => [...DERIVATIVE_FORMATS]))
    const widthsOut = new Set(out.map((d) => d.width))
    for (const d of out) {
      const meta = await sharp(d.bytes).metadata()
      // AVIF is a HEIF container: sharp reports the container, not the coding.
      expect(meta.format === 'heif' || meta.format === d.format).toBe(true)
      if (meta.format === 'heif') expect(d.format).toBe('avif')
      expect(meta.width).toBe(d.width)
      expect(meta.height).toBeGreaterThan(0)
      if (d.width < 2000) expect(Math.abs(d.height / d.width - 0.75)).toBeLessThan(0.01)
    }
    expect(widthsOut.size).toBe(widths.length)
  })

  it('strips EXIF GPS data', async () => {
    const out = await makeDerivatives(await gpsJpeg())
    for (const d of out) expect((await sharp(d.bytes).metadata()).exif).toBeUndefined()
  })

  it('names keys with the contract scheme when given an asset id', async () => {
    const out = await makeDerivatives(await gpsJpeg(700, 500), { id: ID })
    expect(out.map((d) => d.key)).toEqual(
      out.map((d) => `derivatives/v1/${ID}/${d.width}.${d.format}`),
    )
  })

  it('throws on an asset id that is not a content address', async () => {
    await expect(makeDerivatives(await gpsJpeg(700, 500), { id: '../escape' })).rejects.toThrow(
      /32 hex characters/,
    )
  })
})

describe('derivativeWidthsFor', () => {
  it('skips rungs above the source and always emits the source width once', () => {
    expect(derivativeWidthsFor(300, DERIVATIVE_WIDTHS)).toEqual([300])
    expect(derivativeWidthsFor(700, DERIVATIVE_WIDTHS)).toEqual([320, 640, 700])
    expect(derivativeWidthsFor(2000, DERIVATIVE_WIDTHS)).toEqual([320, 640, 1024, 1600, 2000])
    expect(derivativeWidthsFor(2600, DERIVATIVE_WIDTHS)).toEqual([320, 640, 1024, 1600, 2400, 2600])
    expect(derivativeWidthsFor(1000, [640, 640, 0, -3, 1600])).toEqual([640, 1000])
  })
})

describe('isLowResolution', () => {
  it('is true only under a 1,600 px long edge', () => {
    expect(isLowResolution(1599, 1000)).toBe(true)
    expect(isLowResolution(1000, 1599)).toBe(true)
    expect(isLowResolution(1600, 1000)).toBe(false)
    expect(isLowResolution(1000, 2400)).toBe(false)
  })
})

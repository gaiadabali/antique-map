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

/**
 * A JPEG with an EXIF GPS block, as a capture would arrive. The pixels are a smooth gradient,
 * not noise: AVIF encoding time scales with entropy, and a noisy 2000 px frame took 30 s+ on a
 * 2-core CI runner. Nothing here asserts on pixel content, only on geometry and metadata.
 */
async function gpsJpeg(width = 800, height = 600): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      raw[i] = (x * 255) / width
      raw[i + 1] = (y * 255) / height
      raw[i + 2] = 128
    }
  }
  const flat = await sharp(raw, { raw: { width, height, channels: 3 } })
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
  it('never upscales a small image', { timeout: 30_000 }, async () => {
    const out = await makeDerivatives(await gpsJpeg(300, 200))
    expect(out.map((d) => d.width)).toEqual([300, 300])
    expect(out.every((d) => d.width <= 300 && d.height <= 200)).toBe(true)
    expect(out.map((d) => d.height)).toEqual([200, 200])
  })

  it('emits AVIF and WebP for each width', { timeout: 30_000 }, async () => {
    // Three rungs of the ladder, on a source wider than the top one: AVIF is the slow encoder,
    // and the full five-rung ladder on a 2000 px frame overran a 2-core runner.
    const widths = DERIVATIVE_WIDTHS.slice(0, 3)
    const out = await makeDerivatives(await gpsJpeg(1200, 900), { widths })
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
      expect(Math.abs(d.height / d.width - 0.75)).toBeLessThan(0.01)
    }
    expect(widthsOut.size).toBe(widths.length)
  })

  it('strips EXIF GPS data', { timeout: 30_000 }, async () => {
    const out = await makeDerivatives(await gpsJpeg(400, 300), { widths: [320] })
    expect(out).toHaveLength(2)
    for (const d of out) expect((await sharp(d.bytes).metadata()).exif).toBeUndefined()
  })

  it('names keys with the contract scheme when given an asset id', { timeout: 30_000 }, async () => {
    const out = await makeDerivatives(await gpsJpeg(700, 500), { id: ID, widths: [320, 640] })
    expect(out).toHaveLength(4)
    expect(out.map((d) => d.key)).toEqual(
      out.map((d) => `derivatives/v1/${ID}/${d.width}.${d.format}`),
    )
  })

  it('keeps every derivative inside the public long edge', { timeout: 30_000 }, async () => {
    // A tall sheet: 700 wide, 2000 high, under a 1,000 px cap.
    const out = await makeDerivatives(await gpsJpeg(700, 2000), {
      maxLongEdge: 1000,
      widths: [320, 640],
    })
    for (const d of out) expect(Math.max(d.width, d.height)).toBeLessThanOrEqual(1000)
    expect(out.find((d) => d.format === 'webp' && d.key === '320.webp')?.height).toBe(914)
  })

  it('throws on an asset id that is not a content address', async () => {
    await expect(makeDerivatives(await gpsJpeg(700, 500), { id: '../escape' })).rejects.toThrow(
      /32 hex characters/,
    )
  })
})

describe('derivativeWidthsFor', () => {
  it('skips rungs above the source and emits a narrower source whole, once', () => {
    expect(derivativeWidthsFor(300, DERIVATIVE_WIDTHS)).toEqual([300])
    expect(derivativeWidthsFor(700, DERIVATIVE_WIDTHS)).toEqual([320, 640, 700])
    expect(derivativeWidthsFor(2000, DERIVATIVE_WIDTHS)).toEqual([320, 640, 1024, 1600, 2000])
    expect(derivativeWidthsFor(2400, DERIVATIVE_WIDTHS)).toEqual([320, 640, 1024, 1600, 2400])
    // Wider than the top rung: the full width stays the private upload's (ARCHITECTURE.md §8).
    expect(derivativeWidthsFor(2600, DERIVATIVE_WIDTHS)).toEqual([320, 640, 1024, 1600, 2400])
    expect(derivativeWidthsFor(9000, DERIVATIVE_WIDTHS)).toEqual([...DERIVATIVE_WIDTHS])
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

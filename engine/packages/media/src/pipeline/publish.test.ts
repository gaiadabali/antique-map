/**
 * The publish step on a fake store: the bytes are sniffed (F1), every public object is written
 * under C9's keys without metadata (F3), the pyramid is capped and only a long work image gets
 * one, `info.json` comes last with its public `id`, and a second run writes the same keys again.
 */
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { derivativeKey, iiifInfoUrl } from '../contract'
import { publishImage, PUBLIC_CACHE_CONTROL, UnpublishableImageError } from './publish'
import { sniffImageType } from './sniff'

const ID = '0123456789abcdef0123456789abcdef'
const BASE = 'https://media.example.test/indies-media'

type Put = { key: string; bytes: Uint8Array; contentType: string; cacheControl: string }

function fakeStore() {
  const puts: Put[] = []
  return {
    puts,
    keys: () => puts.map((p) => p.key),
    async put(key: string, bytes: Uint8Array, contentType: string, cacheControl: string) {
      puts.push({ key, bytes, contentType, cacheControl })
    },
  }
}

/** A noisy JPEG carrying a GPS position and a camera, as a phone writes one. */
async function gpsJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 30 },
    },
  })
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'Phone 1' },
      IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '8/1 39/1 0/1' },
    })
    .jpeg()
    .toBuffer()
}

const options = (tilesWanted: boolean, publicLongEdge = 4096) => ({
  assetId: ID,
  mediaPublicUrl: BASE,
  tilesWanted,
  publicLongEdge,
})

describe('sniffImageType', () => {
  it('reads the type from the bytes, never a name', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } })
      .png()
      .toBuffer()
    const webp = await sharp(png).webp().toBuffer()
    const avif = await sharp(png).avif().toBuffer()
    expect(sniffImageType(await gpsJpeg(4, 4))).toBe('image/jpeg')
    expect(sniffImageType(png)).toBe('image/png')
    expect(sniffImageType(webp)).toBe('image/webp')
    expect(sniffImageType(avif)).toBe('image/avif')
    expect(sniffImageType(await sharp(png).tiff().toBuffer())).toBeNull()
    expect(sniffImageType(await sharp(png).gif().toBuffer())).toBeNull()
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(sniffImageType(new Uint8Array())).toBeNull()
  })
})

describe('publishImage', () => {
  it(
    'writes the ladder under C9 keys, immutable, with no EXIF or GPS',
    { timeout: 60_000 },
    async () => {
      const store = fakeStore()
      const out = await publishImage(await gpsJpeg(1200, 800), store, options(true))
      expect(out).toMatchObject({
        version: 'v1',
        width: 1200,
        height: 800,
        tiles: 'none',
        tileFiles: 0,
      })
      expect(out.blurDataUri).toMatch(/^data:image\/webp;base64,/)
      const expected = [320, 640, 1024, 1200].flatMap((w) => [
        derivativeKey(ID, w as never, 'avif'),
        derivativeKey(ID, w as never, 'webp'),
      ])
      expect(store.keys().sort()).toEqual(expected.sort())
      for (const put of store.puts) {
        expect(put.cacheControl).toBe(PUBLIC_CACHE_CONTROL)
        expect(put.contentType).toBe(put.key.endsWith('.avif') ? 'image/avif' : 'image/webp')
        const meta = await sharp(put.bytes).metadata()
        expect(meta.exif).toBeUndefined()
        expect(meta.xmp).toBeUndefined()
      }
    },
  )

  it(
    'tiles a long work image, capped, with info.json last at its public id',
    { timeout: 120_000 },
    async () => {
      const store = fakeStore()
      const out = await publishImage(await gpsJpeg(3000, 1000), store, options(true, 2048))
      expect(out.tiles).toBe('ready')
      const last = store.puts.at(-1)!
      expect(last.key).toBe(`iiif/${ID}/info.json`)
      expect(last.contentType).toBe('application/json')
      const info = JSON.parse(Buffer.from(last.bytes).toString('utf8'))
      expect(`${info.id}/info.json`).toBe(iiifInfoUrl(BASE, ID))
      // The pyramid stops at the public long edge, never the upload's.
      expect(info).toMatchObject({ width: 2048, height: 683 })
      const tiles = store.puts.filter(
        (p) => p.key.startsWith(`iiif/${ID}/`) && p.key.endsWith('.jpg'),
      )
      expect(tiles.length).toBe(out.tileFiles - 1)
      for (const tile of tiles) expect((await sharp(tile.bytes).metadata()).exif).toBeUndefined()
      // The ladder stops at its top rung; a derivative never exceeds the cap either.
      expect(store.keys()).toContain(derivativeKey(ID, 2400, 'webp'))
      expect(store.keys().some((k) => k.includes('/3000.'))).toBe(false)
    },
  )

  it('gives no pyramid to a product image, however long', { timeout: 60_000 }, async () => {
    const store = fakeStore()
    const out = await publishImage(await gpsJpeg(2600, 600), store, options(false))
    expect(out.tiles).toBe('none')
    expect(store.keys().some((k) => k.startsWith('iiif/'))).toBe(false)
  })

  it(
    'is idempotent: a second run writes the same keys and nothing new',
    { timeout: 60_000 },
    async () => {
      const upload = await gpsJpeg(700, 500)
      const first = fakeStore()
      const second = fakeStore()
      await publishImage(upload, first, options(true))
      await publishImage(upload, second, options(true))
      expect(second.keys()).toEqual(first.keys())
    },
  )

  it('refuses what is not a media image before decoding it', async () => {
    const store = fakeStore()
    const tiff = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } })
      .tiff()
      .toBuffer()
    await expect(publishImage(tiff, store, options(true))).rejects.toBeInstanceOf(
      UnpublishableImageError,
    )
    await expect(publishImage(Buffer.from('<svg/>'), store, options(true))).rejects.toBeInstanceOf(
      UnpublishableImageError,
    )
    await expect(
      publishImage(await gpsJpeg(8, 8), store, { ...options(true), assetId: '../x' }),
    ).rejects.toBeInstanceOf(UnpublishableImageError)
    expect(store.puts).toEqual([])
  })

  it('reports the displayed size of a photo stored on its side, which the keys follow', async () => {
    // A phone's portrait: 1800 × 1200 pixels on disk, EXIF orientation 6 (shown 1200 × 1800).
    // The stored size (sharp's `metadata()`, as Payload measures it) is the pixels on disk; the
    // derivative keys are the displayed width, so the record must take the displayed size.
    const rotated = await sharp(await gpsJpeg(1800, 1200))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()
    expect(await sharp(rotated).metadata()).toMatchObject({ width: 1800, height: 1200 })
    const store = fakeStore()
    const published = await publishImage(rotated, store, options(false))
    expect(published).toMatchObject({ width: 1200, height: 1800 })
    expect(store.keys()).toContain(derivativeKey(ID, 1200 as never, 'webp'))
    expect(store.keys()).not.toContain(derivativeKey(ID, 1800 as never, 'webp'))
  })
})

/**
 * Tile generation: a Level 0 pyramid with its info.json under the contract's `iiif/`
 * naming when an asset id is given, the pyramid-relative paths otherwise (TASKS.md
 * 5.2.a). Noise sources, because sharp skips blank tiles and the grid must be full.
 */
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { IIIF_TILE_SIZE } from '../contract'
import { makeTiles } from './index'

const ID = '0123456789abcdef0123456789abcdef'

/** A noisy image big enough to need several 512 px tiles. */
async function noisyPng(width = 1200, height = 900): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 30 },
    },
  })
    .png()
    .toBuffer()
}

describe('makeTiles', () => {
  it('tiles produce an info.json and level-0 tiles under iiif/', async () => {
    const { files, info } = await makeTiles(await noisyPng(), { iiifId: ID })
    const infoFile = files.find((f) => f.key === `iiif/${ID}/info.json`)
    expect(infoFile).toBeDefined()
    expect(infoFile?.bytes.length).toBeGreaterThan(0)
    const tiles = files.filter((f) => f.key.endsWith('.jpg') && f.key !== `iiif/${ID}/info.json`)
    expect(tiles.length).toBeGreaterThan(1)
    for (const tile of tiles) {
      expect(tile.key.startsWith(`iiif/${ID}/`)).toBe(true)
      expect(tile.bytes.length).toBeGreaterThan(0)
    }
    expect(info).toMatchObject({ width: 1200, height: 900, profile: 'level0' })
    expect((info as { tiles: { width: number }[] }).tiles[0]?.width).toBe(IIIF_TILE_SIZE)
  })

  it('keeps pyramid-relative keys without an asset id', async () => {
    const { files, info } = await makeTiles(await noisyPng(700, 700))
    const keys = files.map((f) => f.key)
    expect(keys).toContain('info.json')
    expect(keys.every((k) => !k.startsWith('iiif/'))).toBe(true)
    expect(info).toMatchObject({ width: 700, height: 700 })
  })

  it('honours a custom tile size and cleans up after itself', async () => {
    const { info } = await makeTiles(await noisyPng(600, 600), { tileSize: 256 })
    expect((info as { tiles: { width: number }[] }).tiles[0]?.width).toBe(256)
  })

  it('bakes a source into its pyramid in its displayed shape', async () => {
    // A portrait capture: libvips carries the EXIF orientation through `.rotate()`, so the
    // pyramid matches what the viewer shows rather than the sensor's landscape read.
    const { info } = await makeTiles(await noisyPng(400, 1200))
    expect(info).toMatchObject({ width: 400, height: 1200 })
  })
})

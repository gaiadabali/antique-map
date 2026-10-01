/**
 * C9's room plates (v1.4, TASKS.md 6.2.e, 22.7): one shared set, three walls × two framings, each
 * in two crops, and the two rules a mockup and the live preview share — which framing a print
 * hangs at, and where on the crop it hangs (docs/design/imagery/room-scenes.md §2, §5).
 */
import { describe, expect, it } from 'vitest'

import {
  boxFits,
  framingFor,
  placeArt,
  ROOM_CROPS,
  type PixelBox,
  type RoomCrop,
  type RoomPlate,
  type RoomPlateCrop,
} from '../src/contract'

const WALLS = [
  { name: 'warm-white', hex: '#ECE7DE', lab: { l: 92, a: 0.8, b: 4.6 } },
  { name: 'clay', hex: '#B98A6E', lab: { l: 61, a: 12.1, b: 19.4 } },
  { name: 'deep-green', hex: '#2E4A40', lab: { l: 29, a: -11.6, b: 2.1 } },
] as const

// near: 33 px/cm, the art centred at the anchor; wide: 19 px/cm, the art standing on it.
function crops(pxPerCm: number, anchorY: number, box: number, centred: boolean): RoomPlateCrop[] {
  return ROOM_CROPS.map((crop) => {
    const widthPx = crop === 'landscape' ? 6000 : 4000
    const anchor = { x: widthPx / 2, y: anchorY }
    const half = Math.floor(box / 2)
    const artBox: PixelBox = centred
      ? { x: anchor.x - half, y: anchorY - half, width: box, height: box }
      : { x: anchor.x - half, y: anchorY - box, width: box, height: box }
    const assetId = (crop === 'landscape' ? 'a' : 'b').repeat(32)
    return { crop, assetId, widthPx, heightPx: 4000, pxPerCm, anchor, artBox }
  })
}

const SET: RoomPlate[] = WALLS.flatMap((wall): RoomPlate[] => [
  {
    key: `near-${wall.name}`,
    framing: 'near',
    maxOuterLongEdgeCm: 75,
    wallWidthCm: 180,
    wall,
    anchorMode: 'centre',
    crops: crops(33, 1650, 2475, true),
    lightFrom: 'left',
    shadow: { offsetXPerCm: 0.4, offsetYPerCm: 0.6, blurPerCm: 0.8, opacity: 0.35 },
    props: [{ name: 'sideboard', widthCm: 120, heightCm: 80 }],
    provenance: 'rendered',
  },
  {
    key: `wide-${wall.name}`,
    framing: 'wide',
    maxOuterLongEdgeCm: 125,
    wallWidthCm: 320,
    wall,
    anchorMode: 'bottom',
    crops: crops(19, 2600, 2375, false),
    lightFrom: 'left',
    shadow: { offsetXPerCm: 0.4, offsetYPerCm: 0.6, blurPerCm: 0.8, opacity: 0.35 },
    props: [{ name: 'sofa', widthCm: 200, heightCm: 85 }],
    provenance: 'rendered',
  },
])

function cropOf(key: string, crop: RoomCrop): RoomPlateCrop {
  const found = SET.find((plate) => plate.key === key)?.crops.find((c) => c.crop === crop)
  if (!found) throw new Error(`the set has no ${crop} crop of ${key}`)
  return found
}

const inside = (inner: PixelBox, outer: PixelBox) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

describe('the shared set', () => {
  it('is six plates with unique keys, each in every crop, each art box inside its image', () => {
    expect(SET).toHaveLength(6)
    expect(new Set(SET.map((plate) => plate.key)).size).toBe(6)
    for (const plate of SET) {
      expect(plate.crops.map((crop) => crop.crop).sort()).toEqual([...ROOM_CROPS].sort())
      for (const crop of plate.crops) {
        expect(boxFits(crop.artBox, crop.widthPx, crop.heightPx)).toBe(true)
      }
    }
  })
})

describe('framingFor()', () => {
  it.each([
    [21, 'near'],
    [75, 'near'],
    [75.5, 'wide'],
    [125, 'wide'],
    [126, null],
  ])('hangs a %s cm outer long edge at %s', (outer, framing) => {
    expect(framingFor(outer, SET)).toBe(framing)
    expect(framingFor(outer, [...SET].reverse())).toBe(framing)
  })

  it('offers no wall where the set is empty', () => {
    expect(framingFor(30, [])).toBeNull()
  })
})

describe('placeArt()', () => {
  it('centres a near print on the anchor, at the wall’s scale, inside the art box', () => {
    const crop = cropOf('near-warm-white', 'landscape')
    const art = placeArt(crop, 'centre', { widthCm: 50, heightCm: 70 })
    expect(art).toEqual({ x: 2175, y: 495, width: 1650, height: 2310 })
    expect(inside(art, crop.artBox)).toBe(true)
    // the largest print the framing takes fills its art box, and no more
    const largest = placeArt(crop, 'centre', { widthCm: 75, heightCm: 75 })
    expect(largest.width).toBe(crop.artBox.width)
  })

  it('stands a wide print on the anchor, so a larger one grows upward', () => {
    const crop = cropOf('wide-warm-white', 'landscape')
    const art = placeArt(crop, 'bottom', { widthCm: 100, heightCm: 122 })
    expect(art).toEqual({ x: 2050, y: 282, width: 1900, height: 2318 })
    expect(art.y + art.height).toBe(crop.anchor.y)
    expect(inside(art, crop.artBox)).toBe(true)
  })
})

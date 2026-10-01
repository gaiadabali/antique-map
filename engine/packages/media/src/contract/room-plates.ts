/**
 * @contract C9 — media artefacts: the configurator's room plates · owner: ARC · entry
 * `@engine/media/contract`
 *
 * One shared set of pre-composited room plates for every wall-art product type
 * (docs/design/imagery/room-scenes.md; who renders them is D46): frontal, level rooms at two
 * framings and three wall colours, each delivered in two crops, with the geometry a print is
 * placed by. The set is one document per brand database, the `room-plates` global
 * (CONTENT-MODEL.md §6), whose crops are `media` records of role `room-plate`. The configurator's
 * view model carries it to the preview (C2 `PreviewVM`, TASKS.md 22.7, 30.4) and the merch wizard
 * composites its mockups from it (24.1.c), both through `framingFor()` and `placeArt()`, so a
 * mockup and the live preview hang a print at the same place.
 *
 * Geometry is in each crop's own pixels, measured on the file its `assetId` names: a crop whose
 * media is not that file — re-uploaded, re-rendered — is left out of the set, never placed by
 * stale numbers. A bare `§n` below is room-scenes.md's.
 */
import type { AssetId } from '../contract'
import type { PixelBox, PixelPoint } from './masters'
import type { MediaProvenance } from './roles'

/** A sideboard wall for a framed outer long edge up to 75 cm; a sofa wall up to 125 cm (§2). */
export const ROOM_FRAMINGS = ['near', 'wide'] as const
export type RoomFraming = (typeof ROOM_FRAMINGS)[number]

/** 3:2 for a wide screen; 1:1 for the phone's pinned preview — the same scale, other offsets (§9). */
export const ROOM_CROPS = ['landscape', 'square'] as const
export type RoomCrop = (typeof ROOM_CROPS)[number]

/**
 * How the art hangs from the anchor (§5): its centre on it — near, a gallery hang at 145 cm — or
 * the middle of its bottom edge on it — wide, a fixed gap above the sofa, larger art growing up.
 */
export const ROOM_ANCHORS = ['centre', 'bottom'] as const
export type RoomAnchor = (typeof ROOM_ANCHORS)[number]

export type RoomPlateCrop = {
  readonly crop: RoomCrop
  /** The crop's media, by content address: the file this geometry was measured on. */
  readonly assetId: AssetId
  readonly widthPx: number
  readonly heightPx: number
  /**
   * Pixels per centimetre at the wall plane — the same everywhere on it, because the camera is
   * frontal, level and parallel (§5–6); a render's comes from its camera, a photograph's from the
   * 1 m marks of its reference frame.
   */
  readonly pxPerCm: number
  readonly anchor: PixelPoint
  /** The largest art the plate holds at this framing; nothing in the plate overlaps it (§4). */
  readonly artBox: PixelBox
}

export type RoomPlate = {
  /** Unique within the set: `<framing>-<wall>`, `near-warm-white`. */
  readonly key: string
  readonly framing: RoomFraming
  /** The largest framed outer long edge this plate shows, in cm: near 75, wide 125 (§2). */
  readonly maxOuterLongEdgeCm: number
  /** The width of wall the plate shows, in cm: the caption's "Wall shown: 1.8 m wide" (§8). */
  readonly wallWidthCm: number
  /** A room's wall, not the brand's palette (§3). */
  readonly wall: {
    readonly name: string
    readonly hex: string
    readonly lab: { readonly l: number; readonly a: number; readonly b: number }
  }
  readonly anchorMode: RoomAnchor
  /** One per `ROOM_CROPS` value. */
  readonly crops: readonly RoomPlateCrop[]
  /** The daylight's side, out of frame — the same in every plate of a set (§7). */
  readonly lightFrom: 'left' | 'right'
  /**
   * The print's cast shadow, a layer of its own because it depends on the frame's depth (§7):
   * offsets and blur in centimetres on the wall per centimetre of frame depth, and an opacity from
   * 0 to 1 — lighter on the dark wall.
   */
  readonly shadow: {
    readonly offsetXPerCm: number
    readonly offsetYPerCm: number
    readonly blurPerCm: number
    readonly opacity: number
  }
  /** The scale props and their stated sizes, kept for the plate's scale check (§4, §12). */
  readonly props: readonly {
    readonly name: string
    readonly widthCm: number
    readonly heightCm: number
  }[]
  /** Rendered, or a photograph of a real wall — never AI-generated, never stock (§10). */
  readonly provenance: Extract<MediaProvenance, 'rendered' | 'photograph'>
}

/**
 * The framing a framed print of this outer long edge is shown at: the one with the smallest limit
 * it fits under, or `null` — no On-a-wall view — above every limit the set has (§2).
 */
export function framingFor(
  outerLongEdgeCm: number,
  plates: readonly Pick<RoomPlate, 'framing' | 'maxOuterLongEdgeCm'>[],
): RoomFraming | null {
  const fitting = plates
    .filter((plate) => outerLongEdgeCm <= plate.maxOuterLongEdgeCm)
    .sort((a, b) => a.maxOuterLongEdgeCm - b.maxOuterLongEdgeCm)
  return fitting[0]?.framing ?? null
}

/**
 * Where a framed print of this outer size hangs on a crop, in the crop's pixels (fractional; the
 * renderer rounds): its size is the outer size times `pxPerCm`, centred on the anchor across, and
 * placed by `anchorMode` down. The layers under and over it — shadow, frame, mount, the design's
 * image, a glazing sheen — are the renderer's, in that order (§7).
 */
export function placeArt(
  crop: Pick<RoomPlateCrop, 'pxPerCm' | 'anchor'>,
  anchorMode: RoomAnchor,
  outer: { readonly widthCm: number; readonly heightCm: number },
): { x: number; y: number; width: number; height: number } {
  const width = outer.widthCm * crop.pxPerCm
  const height = outer.heightCm * crop.pxPerCm
  const x = crop.anchor.x - width / 2
  const y = anchorMode === 'centre' ? crop.anchor.y - height / 2 : crop.anchor.y - height
  return { x, y, width, height }
}

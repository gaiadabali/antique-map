/**
 * Which measured side is the height. The old catalogue wrote sizes in both
 * orders — of the crawled items whose image and measurement disagree in
 * shape, about 4 in 10 put the width first and 6 in 10 the height — so the
 * order of the numbers says nothing. The item's own photograph does: a
 * portrait image means the longer side is the height. With no image, a
 * near-square image, or an image whose proportions do not match the
 * measurement, the orientation goes to review.
 */
import type { ImageSize } from './image-size.ts'
import {
  accept,
  empty,
  review,
  type Measured,
  type MeasuredDimensions,
  type Orientation,
  type Parsed,
  type Size,
} from './types.ts'

/** Below this ratio of long side to short side an image is too square to orient by. */
const SQUARE_RATIO = 1.03
/** A photograph includes margins and mount, so its shape may differ from the measurement — but not by this much. */
const SHAPE_TOLERANCE = 0.35

export function parseOrientation(
  dimensions: MeasuredDimensions | null,
  image: ImageSize | null,
): Parsed<Orientation> {
  const reference = dimensions?.sheet ?? dimensions?.image ?? null
  if (reference === null) return empty(null)
  const raw = image === null ? null : `${image.widthPx}x${image.heightPx}px`
  const measuredRatio = ratio(reference.sidesMm[0], reference.sidesMm[1])
  // Only equal sides make a square: a near-square item still needs its height and width told apart.
  if (isSquareEverywhere(dimensions)) return accept(raw, 'square')
  if (image === null) return review(raw, null, 'no image to tell the height from the width')
  const imageRatio = ratio(image.widthPx, image.heightPx)
  if (imageRatio < SQUARE_RATIO) return review(raw, null, 'the image is square but the item is not')
  const orientation: Orientation = image.heightPx > image.widthPx ? 'portrait' : 'landscape'
  if (Math.abs(Math.log(measuredRatio) - Math.log(imageRatio)) > SHAPE_TOLERANCE) {
    return review(raw, orientation, 'the image proportions do not match the measurement')
  }
  return accept(raw, orientation)
}

/** C2 `SizeVM`s once the orientation is known. */
export function toSizes(
  dimensions: MeasuredDimensions,
  orientation: Orientation,
): { image: Size | null; sheet: Size | null } {
  return {
    image: dimensions.image === null ? null : toSize(dimensions.image, orientation),
    sheet: dimensions.sheet === null ? null : toSize(dimensions.sheet, orientation),
  }
}

function toSize(measured: Measured, orientation: Orientation): Size {
  const long = Math.max(...measured.sidesMm)
  const short = Math.min(...measured.sidesMm)
  return orientation === 'landscape'
    ? { heightMm: short, widthMm: long }
    : { heightMm: long, widthMm: short }
}

function ratio(a: number, b: number): number {
  return Math.max(a, b) / Math.max(1, Math.min(a, b))
}

function isSquareEverywhere(dimensions: MeasuredDimensions | null): boolean {
  return [dimensions?.image, dimensions?.sheet].every(
    (measured) => measured == null || measured.sidesMm[0] === measured.sidesMm[1],
  )
}

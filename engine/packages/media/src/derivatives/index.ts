/**
 * Derivative generation (TASKS.md 5.2.a): AVIF and WebP at the contract's width ladder,
 * EXIF GPS and every other metadata stripped, never upscaled. Pure library — the media
 * pipeline (`../pipeline`, wired to the upload by `@engine/cms`'s media hooks) feeds it the
 * processed upload and puts the results under the keys returned here in the public
 * `derivatives/` prefix (ARCHITECTURE.md §8).
 */
import sharp from 'sharp'

import {
  ASSET_ID_PATTERN,
  DERIVATIVE_FORMATS,
  DERIVATIVE_WIDTHS,
  derivativeKey,
  type DerivativeFormat,
  type DerivativeWidth,
} from '../contract'

/** One rendered derivative: its final pixel size, bytes and the key it is uploaded to. */
export type Derivative = {
  width: number
  height: number
  format: DerivativeFormat
  bytes: Buffer
  key: string
}

export interface MakeDerivativesOptions {
  /** Widths to render; defaults to the contract's `DERIVATIVE_WIDTHS` ladder. */
  widths?: readonly number[]
  /**
   * The image's content address (`AssetId`). Given, each key is the contract's full
   * `derivativeKey(id, …)`; without it the key is the asset-relative part of that naming
   * (`<width>.<format>`), which the caller composes into a full key once it knows the id.
   */
  id?: string
  /**
   * The public long edge (the gallery's `publicZoomMaxPx`): no derivative is taller or wider
   * than this, so a tall sheet's top rung never exceeds the cap the deep zoom keeps. Unset, the
   * width ladder alone bounds the output.
   */
  maxLongEdge?: number
}

/**
 * Whether a source image is below the viewer's zoom threshold: its long edge under
 * 1,600 px. The viewer is honest about such legacy photos (TASKS.md 5.2.c) — it opens
 * the largest derivative and offers no zoom, rather than an empty pyramid.
 */
export function isLowResolution(width: number, height: number): boolean {
  return Math.max(width, height) < 1600
}

/**
 * The widths worth rendering for a source this wide, ascending and unique: the ladder
 * rungs at or under the source, plus the source width itself once when it is narrower than
 * the ladder's top — so a small image's largest derivative is the whole picture
 * (ARCHITECTURE.md §8: an image no longer than the largest derivative opens in the viewer
 * from that derivative). A source wider than the top rung stops at the top rung: its full
 * width is the private upload's, never a public derivative's.
 */
export function derivativeWidthsFor(sourceWidth: number, widths: readonly number[]): number[] {
  const usable = widths.filter((w) => w > 0)
  const rungs = [...new Set(usable.filter((w) => w <= sourceWidth))].sort((a, b) => a - b)
  const top = Math.max(0, ...usable)
  if (sourceWidth < top && !rungs.includes(sourceWidth)) rungs.push(sourceWidth)
  return rungs
}

function derivativeKeyFor(id: string | undefined, width: number, format: DerivativeFormat): string {
  if (id !== undefined) return derivativeKey(id, width as DerivativeWidth, format)
  return `${width}.${format}`
}

/**
 * Render every derivative for a processed upload. Orientation is baked (`rotate()` on the
 * pre-rotation measurements), so a portrait source renders against its displayed width,
 * and sharp's default (no `withMetadata`) strips all metadata — EXIF location included.
 * Never a network call, never a bucket write.
 */
export async function makeDerivatives(
  input: Buffer,
  opts?: MakeDerivativesOptions,
): Promise<Derivative[]> {
  const widths = opts?.widths ?? DERIVATIVE_WIDTHS
  if (opts?.id !== undefined && !ASSET_ID_PATTERN.test(opts.id)) {
    throw new Error(`id must be 32 hex characters, not "${opts.id}"`)
  }
  const meta = await sharp(input).metadata()
  if (meta.width === undefined || meta.height === undefined) {
    throw new Error('the source has no pixel dimensions')
  }
  // EXIF orientation 5–8 swaps the axes: the viewer sees height across.
  const rotated = meta.orientation !== undefined && meta.orientation >= 5
  const sourceWidth = rotated ? meta.height : meta.width
  const sourceHeight = rotated ? meta.width : meta.height

  const out: Derivative[] = []
  for (const width of derivativeWidthsFor(sourceWidth, widths)) {
    for (const format of DERIVATIVE_FORMATS) {
      const pipeline = sharp(input).rotate().toFormat(format)
      const cap = opts?.maxLongEdge
      if (cap !== undefined && Math.max(width, (width * sourceHeight) / sourceWidth) > cap) {
        pipeline.resize({ width, height: cap, fit: 'inside', withoutEnlargement: true })
      } else if (width < sourceWidth) {
        pipeline.resize({ width, withoutEnlargement: true })
      }
      const rendered = await pipeline.toBuffer({ resolveWithObject: true })
      // AVIF is a HEIF container: sharp reports the container, not the coding.
      const reported =
        format === 'avif' && rendered.info.format === 'heif' ? 'avif' : rendered.info.format
      if (reported !== format) {
        throw new Error(`expected ${format}, rendered ${rendered.info.format}`)
      }
      out.push({
        width: rendered.info.width,
        height: rendered.info.height,
        format,
        bytes: rendered.data,
        key: derivativeKeyFor(opts?.id, width, format),
      })
    }
  }
  if (out.length === 0)
    throw new Error(`no derivative rendered for a ${sourceWidth}×${sourceHeight} source`)
  return out
}

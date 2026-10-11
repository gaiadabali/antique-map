/**
 * The thumbnail a card shows. The storefront's rule (`apps/web/src/server/media/public-image.ts`,
 * which the cms package cannot import) built from the same C9 key builders: the public WebP
 * derivative `derivatives/v1/<asset>/<w>.webp` once the pipeline has published it, else the
 * record's own file (staff-only, which is who looks at the wall), else nothing.
 */
import {
  ASSET_ID_PATTERN,
  DERIVATIVE_WIDTHS,
  derivativeKey,
  type DerivativeWidth,
} from '@engine/media/contract'

type Doc = Record<string, unknown>

/** A card's slot is about 260 px: the 640 rung covers it at 2x. */
const WANTED = 640
const TOP = DERIVATIVE_WIDTHS[DERIVATIVE_WIDTHS.length - 1] ?? 2400

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The rung nearest to what a card needs among those the ladder made for a source this wide. */
export function thumbnailWidth(sourceWidth: number): DerivativeWidth {
  const rungs: number[] = DERIVATIVE_WIDTHS.filter((rung) => rung <= sourceWidth)
  // A source narrower than the top rung is rendered whole: its own width is a rung too.
  if (sourceWidth < TOP && !rungs.includes(sourceWidth)) rungs.push(sourceWidth)
  rungs.sort((a, b) => a - b)
  return (rungs.find((rung) => rung >= WANTED) ??
    rungs[rungs.length - 1] ??
    sourceWidth) as DerivativeWidth
}

export function thumbnailUrl(
  media: unknown,
  base: string = process.env.MEDIA_PUBLIC_URL ?? '',
): string | null {
  if (media === null || typeof media !== 'object') return null
  const doc = media as Doc
  const root = base.replace(/\/+$/, '')
  const assetId = text(doc.assetId)
  const width = doc.width
  const ready = (doc.derivatives as Doc | null | undefined)?.status === 'ready'
  if (
    root !== '' &&
    ready &&
    ASSET_ID_PATTERN.test(assetId) &&
    typeof width === 'number' &&
    width > 0
  ) {
    return `${root}/${derivativeKey(assetId, thumbnailWidth(width), 'webp')}`
  }
  return text(doc.thumbnailURL) || text(doc.url) || null
}

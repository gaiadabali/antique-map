/**
 * Which URL the public is given for a `media` image (C9; ARCHITECTURE.md §8): its largest public
 * derivative once the media pipeline has published it, else the record's own file. The record's
 * own file is Payload's staff-only route (`@engine/cms` `collections/media/access`), so until the
 * pipeline has run an anonymous visitor's image does not load — never a leak, only a gap the
 * backfill (`pnpm --filter @engine/cms media:derivatives`) closes. Every loader that shows an
 * image chooses through here, with the C9 key builders, never building a media URL by hand.
 */
import {
  ASSET_ID_PATTERN,
  DERIVATIVE_WIDTHS,
  derivativeKey,
  type DerivativeWidth,
} from '@engine/media/contract'

type Doc = Record<string, unknown>

/** What a loader selects on a `media` relation to choose its public URL. */
export const PUBLIC_IMAGE_SELECT = {
  url: true,
  alt: true,
  width: true,
  height: true,
  assetId: true,
  derivatives: { status: true },
} as const

/** The ladder's top rung: no public derivative is wider (C9 `DERIVATIVE_WIDTHS`). */
const TOP_RUNG: DerivativeWidth = DERIVATIVE_WIDTHS[DERIVATIVE_WIDTHS.length - 1] ?? 2400

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

/** The media bucket's public base (`MEDIA_PUBLIC_URL`), without a trailing slash; empty when
 * the environment names none, and every image then answers with its own file. */
export function mediaPublicUrl(): string {
  const url = process.env.MEDIA_PUBLIC_URL
  return typeof url === 'string' && url !== '' ? url.replace(/\/+$/, '') : ''
}

/** The record's content address, when it has a valid one. */
export function assetIdOf(media: Doc): string | null {
  const id = str(media.assetId)
  return ASSET_ID_PATTERN.test(id) ? id : null
}

/**
 * The widest derivative the ladder made for a source this wide: the source's own width when it is
 * narrower than the top rung (the ladder renders a small image whole), else the top rung — so the
 * URL never points past the public cap (`@engine/media` `derivativeWidthsFor()`).
 */
export function largestDerivativeWidth(width: number): DerivativeWidth {
  return (width < TOP_RUNG ? width : TOP_RUNG) as DerivativeWidth
}

/** The largest public WebP derivative, once the pipeline has published it; else `null`. */
export function derivativeUrlOf(media: Doc, base: string = mediaPublicUrl()): string | null {
  const assetId = assetIdOf(media)
  const width = positive(media.width)
  const ready = (media.derivatives as Doc | null | undefined)?.status === 'ready'
  if (base === '' || assetId === null || width === null || !ready) return null
  return `${base}/${derivativeKey(assetId, largestDerivativeWidth(width), 'webp')}`
}

/** The URL the public is shown: the derivative, else the record's own file; `null` for none. */
export function publicImageUrl(media: Doc, base: string = mediaPublicUrl()): string | null {
  const own = str(media.url)
  return derivativeUrlOf(media, base) ?? (own === '' ? null : own)
}

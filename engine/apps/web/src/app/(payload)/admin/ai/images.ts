/**
 * The drafting tool's photographs, fetched on the server (TASKS.md 8.3.a; AI.md §5): the `@engine/
 * cms/ai` `DraftImageSource` port. Each is the media pipeline's public WebP derivative — re-encoded,
 * no camera or GPS metadata — at the widest rung whose long edge is at most 1,600 px, built with
 * the C9 key builder under `MEDIA_PUBLIC_URL` (never a URL from a request or a record). An image
 * whose derivatives are not made yet is not sent; the upload itself, which may still carry its
 * metadata, never is.
 */
import 'server-only'

import type { DraftImage, DraftImageSource, DraftMediaFacts } from '@engine/cms/ai'
import { ASSET_ID_PATTERN, derivativeKey, type DerivativeWidth } from '@engine/media/contract'

import { derivativeWidthsOf } from '../../../../server/media/public-image'

export const DRAFT_LONG_EDGE = 1600
const MAX_BYTES = 8 * 1024 * 1024
const TIMEOUT_MS = 15_000

/** The widest rung of this image's ladder whose long edge is at most `DRAFT_LONG_EDGE`. */
export function draftRung(width: number, height: number | null): number {
  const rungs = derivativeWidthsOf(width)
  const scale = height && height > width ? height / width : 1
  const fits = rungs.filter((rung) => rung * scale <= DRAFT_LONG_EDGE)
  return fits.length > 0 ? Math.max(...fits) : Math.min(...rungs)
}

export function draftImageUrl(media: DraftMediaFacts, base: string): string | null {
  const width = media.width
  if (!base || !media.derivativesReady || !media.assetId) return null
  if (!ASSET_ID_PATTERN.test(media.assetId) || !width || width <= 0) return null
  const rung = draftRung(width, media.height) as DerivativeWidth
  return `${base.replace(/\/+$/, '')}/${derivativeKey(media.assetId, rung, 'webp')}`
}

export function derivativeImageSource(
  base: string,
  fetcher: typeof fetch = fetch,
): DraftImageSource {
  return {
    async load(media, signal): Promise<DraftImage | null> {
      const url = draftImageUrl(media, base)
      if (url === null) return null
      const timeout = AbortSignal.timeout(TIMEOUT_MS)
      const response = await fetcher(url, {
        redirect: 'error',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      }).catch(() => null)
      if (!response?.ok) return null
      if (!(response.headers.get('content-type') ?? '').startsWith('image/webp')) return null
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length === 0 || bytes.length > MAX_BYTES) return null
      return { mediaId: media.id, mediaType: 'image/webp', data: bytes.toString('base64') }
    },
  }
}

/**
 * The item page's images (5.2.b, 5.2.c): a work's `images[].media` rows, resolved to the public
 * addresses the page and the viewer use, in page order. Media URLs are built here, in the view
 * model, with the C9 key builders (`@engine/media/contract`), never in a component: the viewer's
 * tile source is the image's capped IIIF `info.json` when the pipeline built the pyramid, else
 * the largest public derivative, else the media record's own file.
 */
import {
  MEDIA_PROVENANCES,
  MEDIA_ROLES,
  SYNTHETIC_LABEL,
  iiifInfoUrl,
  orderImages,
  primaryImageIndex,
  type MediaProvenance,
  type MediaRole,
} from '@engine/media/contract'

import { assetIdOf, derivativeUrlOf, mediaPublicUrl } from '../../media/public-image'
import type { ItemImage } from './view-model'

type Doc = Record<string, unknown>

/** The long edge under which a legacy photo cannot zoom (C9 `isLowResolution`, 5.2.c). */
const LOW_RESOLUTION_EDGE = 1600

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const int = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

const roleOf = (value: unknown): MediaRole =>
  (MEDIA_ROLES as readonly string[]).includes(str(value)) ? (str(value) as MediaRole) : 'detail'
const provenanceOf = (value: unknown): MediaProvenance =>
  (MEDIA_PROVENANCES as readonly string[]).includes(str(value))
    ? (str(value) as MediaProvenance)
    : 'photograph'

type Resolved = ItemImage & { readonly provenance: MediaProvenance }

function imageOf(media: Doc, base: string): Resolved | null {
  const url = str(media.url)
  if (url === '') return null
  const assetId = assetIdOf(media)
  const width = int(media.width)
  const height = int(media.height)
  const iiifReady = (media.iiif as Doc | null | undefined)?.status === 'ready'
  const infoUrl = base !== '' && assetId !== null && iiifReady ? iiifInfoUrl(base, assetId) : null
  const derivative = derivativeUrlOf(media, base)
  const provenance = provenanceOf(media.provenance)
  return {
    // The record's own file is Payload's staff-only route (`collections/media/access`); the
    // public's image is the derivative once the media pipeline has made it (`../../media`).
    url: derivative ?? url,
    alt: str(media.alt),
    role: roleOf(media.role),
    provenance,
    syntheticLabel: SYNTHETIC_LABEL[provenance],
    width,
    height,
    infoUrl,
    viewerSrc: derivative ?? url,
    lowResolution:
      width !== null && height !== null && Math.max(width, height) < LOW_RESOLUTION_EDGE,
  }
}

/** A work's image rows as the page shows them, in page order, with the lead image's index. */
export function itemImagesOf(rows: readonly Doc[]): {
  readonly images: readonly ItemImage[]
  readonly primaryIndex: number
} {
  const base = mediaPublicUrl()
  const resolved = rows
    .map((row) => row.media)
    .filter((media): media is Doc => typeof media === 'object' && media !== null)
    .map((media) => imageOf(media, base))
    .filter((image): image is Resolved => image !== null)
  const ordered = orderImages('work', resolved)
  const primaryIndex = primaryImageIndex('work', ordered)
  const images = ordered.map(({ provenance: _provenance, ...image }) => image)
  return { images, primaryIndex }
}

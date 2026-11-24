/**
 * The shop's product images (6-followup-5, 10.6): a media record as a page shows it — the public
 * derivative, its alt, and the synthetic label its provenance carries.
 */
import {
  MEDIA_PROVENANCES,
  SYNTHETIC_LABEL,
  type MediaProvenance,
  type SyntheticLabel,
} from '@engine/media/contract'

import { derivativeSrcSetOf, derivativeUrlOf } from '@engine/site/media/public-image'
import type { CatalogueImage } from './view-models'

/**
 * An image's label from its stored provenance; an unknown or missing one is a photograph. The shop
 * shows no "Digital mockup" label (the owner's request, 2026-11-24): its prints are shown framed
 * and in rooms by design. An AI-generated image keeps its label.
 */
const syntheticLabelOf = (provenance: unknown): SyntheticLabel | null => {
  if (!(MEDIA_PROVENANCES as readonly unknown[]).includes(provenance)) return null
  const label = SYNTHETIC_LABEL[provenance as MediaProvenance]
  return label === 'digital-mockup' ? null : label
}

/**
 * An image as the shop shows it: the public derivative, once the media pipeline has published it
 * (`../../media/public-image`), never the record's own file — that route is staff-only and
 * answers 403 to the public, so a not-yet-processed image is no image here, not that fallback.
 */
export function imageOf(media: unknown): CatalogueImage | null {
  if (typeof media !== 'object' || media === null) return null
  const record = media as Record<string, unknown>
  if (typeof record.alt !== 'string') return null
  const url = derivativeUrlOf(record)
  if (url === null) return null
  const srcSet = derivativeSrcSetOf(record)
  return {
    url,
    alt: record.alt,
    width: typeof record.width === 'number' ? record.width : null,
    height: typeof record.height === 'number' ? record.height : null,
    ...(srcSet !== null ? { srcSet } : {}),
    syntheticLabel: syntheticLabelOf(record.provenance),
  }
}

export function imagesOf(doc: {
  images?: readonly { image?: unknown }[] | null
}): CatalogueImage[] {
  return (doc.images ?? [])
    .map((row) => imageOf(row.image))
    .filter((image): image is CatalogueImage => image !== null)
}

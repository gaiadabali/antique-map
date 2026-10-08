/**
 * A product's pictures, with role and provenance set honestly (CONTENT-MODEL.md §6; DATA.md §5).
 * The importer's own product-image path stamps every file `flat` + `photograph`, so this layer
 * makes its media itself (`./attach`) from these decisions:
 *
 * - **The catalogue artwork** is the owner's reproduction of the design — a scan-like digital
 *   image, not a photograph of an object. The provenance list has no "reproduction", and the only
 *   other values label the picture "Digital mockup", which it is not; it goes in as `photograph`
 *   (unlabelled), one constant here to change if the owner's media rules say otherwise.
 * - **An Instagram crop with the shop's logo tile placed on it** is the artwork edited: `composite`.
 * - **The matted and framed pictures** are digital mock-ups (a print in a cream mat with a story
 *   card, or in a wood frame, on a dark background): `rendered`, both labelled "Digital mockup"
 *   wherever shown. A framed mock-up hangs on a wall: role `in-room`; a mounted one lies `flat`.
 */
import { basename } from 'node:path'

import type { ImageKind, ProductImage } from './types'

/** How the catalogue artwork is declared (see above). */
export const ARTWORK_PROVENANCE = 'photograph' as const

const KIND: Record<ImageKind, Pick<ProductImage, 'role' | 'provenance'>> = {
  artwork: { role: 'flat', provenance: ARTWORK_PROVENANCE },
  'artwork-branded': { role: 'flat', provenance: 'composite' },
  'mockup-mounted': { role: 'flat', provenance: 'rendered' },
  'mockup-framed': { role: 'in-room', provenance: 'rendered' },
}

const ALT: Record<ImageKind, { en: string; id: string }> = {
  artwork: { en: '', id: '' },
  'artwork-branded': { en: ', close view of the artwork', id: ', tampilan dekat karya' },
  'mockup-mounted': {
    en: ', print in a cream mat with its story card',
    id: ', cetakan dengan passe-partout krem dan kartu ceritanya',
  },
  'mockup-framed': {
    en: ', print in a wood frame with a cream mat',
    id: ', cetakan dalam bingkai kayu dengan passe-partout krem',
  },
}

export function productImage(
  path: string,
  kind: ImageKind,
  names: { en: string; id: string },
): ProductImage {
  return {
    path,
    fileName: basename(path),
    kind,
    ...KIND[kind],
    altEn: `${names.en}${ALT[kind].en}`,
    altId: `${names.id}${ALT[kind].id}`,
  }
}

/** The artwork-like pictures first, then the mock-ups, each group in the file's order. */
export function artworkFirst(images: readonly ProductImage[]): ProductImage[] {
  const isArtwork = (image: ProductImage) =>
    image.kind === 'artwork' || image.kind === 'artwork-branded'
  return [...images.filter(isArtwork), ...images.filter((image) => !isArtwork(image))]
}

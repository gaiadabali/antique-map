/**
 * A synthetic product image's label (10.6): anything but a photograph is labelled wherever it is
 * shown (CONTENT-MODEL.md �5). The words are the lexicon's `image.synthetic.<label>` (the visible
 * label) and `image.syntheticAlt.<label>` (the alt's prefix, never stored in the media's own alt).
 */
import { renderedAlt } from '@engine/media/contract'

import type { CatalogueImage } from '../../../server/shop/catalogue/view-models'
import type { ProductText } from './copy'

/** The visible label, or null for a photograph. */
export function syntheticLabelText(text: ProductText, image: CatalogueImage): string | null {
  return image.syntheticLabel === null
    ? null
    : text.shared(`image.synthetic.${image.syntheticLabel}`)
}

/** The image's alt as shown: a synthetic image's alt opens with its label's words. */
export function imageAlt(text: ProductText, image: CatalogueImage): string {
  return renderedAlt(image.alt, image.syntheticLabel, {
    label: (label) => text.shared(`image.synthetic.${label}`),
    labelled: (label, alt) => text.shared(`image.syntheticAlt.${label}`, { alt }),
  })
}

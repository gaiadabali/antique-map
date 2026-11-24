/** The hero frame's window shape (`./hero`), kept pure so it is tested on its own. */
import type { CatalogueImage } from '../../../server/shop/catalogue/view-models'

/** The print's own width over height, held between 4:5 and 5:4 so a long sheet is cropped, never
 * dwarfed; square while its size is unknown. */
export function windowRatio(image: Pick<CatalogueImage, 'width' | 'height'> | null): number {
  if (image?.width && image.height) return Math.min(1.25, Math.max(0.8, image.width / image.height))
  return 1
}

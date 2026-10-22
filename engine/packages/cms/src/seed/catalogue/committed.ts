/**
 * The owner's designs committed to the repo (`./data/designs.json` + `./data/images`): the 156
 * products — catalogue PDFs and Instagram — the local shop held, exported once with their pictures
 * so a server, which holds no `LEGACY_DATA_DIR`, seeds the same shop through the admin's seed
 * screen. Product-level, as the shop stored them: names, descriptions, category and pictures are
 * read back, not re-derived from the extraction; the variants and placeholder prices are
 * `./types`'s, as for every design.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { withVariants } from './build'
import { DESIGN_IMAGES } from './data/design-images'
import { productImage } from './images'
import type { CatalogueProduct, CategoryLabel, ImageKind } from './types'

type CommittedDesign = {
  readonly sku: string
  readonly nameEn: string
  readonly nameId: string
  readonly descriptionEn: string
  readonly descriptionId: string
  readonly category: CategoryLabel
  /** In the product's order; each file is stored under this name (`./images` `nameImages`). */
  readonly images: ReadonlyArray<{ readonly file: string; readonly kind: ImageKind }>
}

/** By a `new URL()` a bundler follows (see `./data/design-images`). */
const DESIGNS_FILE = new URL('./data/designs.json', import.meta.url)

export function loadCommittedDesigns(): CatalogueProduct[] {
  const { designs } = JSON.parse(readFileSync(DESIGNS_FILE, 'utf8')) as {
    designs: CommittedDesign[]
  }
  return designs.map((design) => {
    const names = { en: design.nameEn, id: design.nameId }
    const images = design.images.map((image) => {
      const url = DESIGN_IMAGES[image.file]
      if (url === undefined) {
        throw new Error(`The committed picture '${image.file}' is not in ./data/design-images.`)
      }
      return productImage(fileURLToPath(url), image.kind, names)
    })
    return withVariants(design.sku, {
      nameEn: design.nameEn,
      nameId: design.nameId,
      descriptionEn: design.descriptionEn,
      descriptionId: design.descriptionId,
      category: design.category,
      images,
    })
  })
}

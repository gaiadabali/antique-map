/**
 * The designs → products (task 10.6.e), pure: records in, `CatalogueProduct`s out. One product per
 * design, two variants each; names, categories, descriptions and pictures as `./naming` and
 * `./images` decide. Nothing here touches the disk or the database.
 */
import { join } from 'node:path'

import { SKU_MAX_LENGTH, SKU_PATTERN } from '../../collections/products/skus'
import { artworkFirst, productImage } from './images'
import { categoryOf, INSTAGRAM_CATEGORIES, productName } from './naming'
import {
  SKU_PREFIX,
  VARIANTS,
  type CatalogueDirs,
  type CatalogueProduct,
  type DesignRecord,
  type InstagramRecord,
} from './types'

/** Plain text for the importer: LF line ends, blank lines between paragraphs, no outer space. */
const plain = (text: string) => text.replace(/\r\n?/g, '\n').trim()

function withVariants(sku: string, base: Omit<CatalogueProduct, 'sku' | 'variants' | 'priceIdr'>) {
  if (!SKU_PATTERN.test(sku) || `${sku}-M`.length > SKU_MAX_LENGTH) {
    throw new Error(`The design SKU '${sku}' is not a valid SKU.`)
  }
  const variants = VARIANTS.map((variant) => ({
    sku: `${sku}-${variant.suffix}`,
    labelEn: variant.labelEn,
    labelId: variant.labelId,
    priceIdr: variant.priceIdr,
  }))
  return {
    sku,
    ...base,
    priceIdr: Math.min(...variants.map((variant) => variant.priceIdr)),
    variants,
  }
}

export function designProduct(design: DesignRecord, dirs: CatalogueDirs): CatalogueProduct {
  const nameEn = productName(design.title, design.date, 'en')
  const nameId = productName(design.name_id, design.date, 'id')
  return withVariants(`${SKU_PREFIX}${design.code}`, {
    nameEn,
    nameId,
    descriptionEn: plain(design.description_en),
    descriptionId: plain(design.description_id),
    category: categoryOf(design.catalogues),
    images: [
      productImage(join(dirs.designs, design.image.file), 'artwork', { en: nameEn, id: nameId }),
    ],
  })
}

export function instagramProduct(
  record: InstagramRecord,
  position: number,
  dirs: CatalogueDirs,
): CatalogueProduct {
  const category = INSTAGRAM_CATEGORIES[record.id]
  if (category === undefined)
    throw new Error(`No category is set for the Instagram design ${record.id}.`)
  const nameEn = productName(record.name_en ?? record.title, record.date, 'en')
  const nameId = productName(record.name_id, record.date, 'id')
  const images = record.images.map((image) =>
    productImage(join(dirs.instagram, image.file), image.kind, { en: nameEn, id: nameId }),
  )
  return withVariants(`${SKU_PREFIX}IG${String(position + 1).padStart(2, '0')}`, {
    nameEn,
    nameId,
    descriptionEn: plain(record.description_en),
    descriptionId: plain(record.description_id),
    category,
    images: artworkFirst(images),
  })
}

/** Every design, the catalogue ones in file order, then the Instagram ones. */
export function buildCatalogue(
  designs: readonly DesignRecord[],
  instagram: readonly InstagramRecord[],
  dirs: CatalogueDirs,
): CatalogueProduct[] {
  const products = [
    ...designs.map((design) => designProduct(design, dirs)),
    ...instagram.map((record, index) => instagramProduct(record, index, dirs)),
  ]
  const seen = new Set<string>()
  for (const product of products) {
    for (const sku of [product.sku, ...product.variants.map((variant) => variant.sku)]) {
      if (seen.has(sku)) throw new Error(`The SKU '${sku}' appears twice in the designs.`)
      seen.add(sku)
    }
  }
  return products
}

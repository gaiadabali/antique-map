/**
 * The shop-catalogue layer's shapes and fixed choices (DATA.md §2, task 10.6.e): the owner's real
 * shop designs — the 152 in his six catalogue PDFs and the 4 only his Instagram shows — as
 * products with two variants each and **marked placeholder prices**.
 */

/** Every product, variant and (via the shop mock's stores) stock row of this layer starts here. */
export const SKU_PREFIX = 'SEED-'

/**
 * The placeholder prices, whole rupiah, the same for every design (DATA.md §2): anchored on the
 * owner's archived Squarespace price of SGD 78.80 for a framed print. They stand until the
 * owner's price list (OA4) arrives; the product's own price is the lower one.
 */
export const PLACEHOLDER_PRICE_IDR = { mounted: 450_000, framed: 950_000 } as const

/** The two product forms the owner's Instagram shows; no sizes are known. */
export const VARIANTS = [
  {
    suffix: 'M',
    form: 'mounted',
    labelEn: 'Mounted print',
    labelId: 'Cetak dengan passe-partout',
    priceIdr: PLACEHOLDER_PRICE_IDR.mounted,
  },
  {
    suffix: 'F',
    form: 'framed',
    labelEn: 'Framed print',
    labelId: 'Cetak berbingkai',
    priceIdr: PLACEHOLDER_PRICE_IDR.framed,
  },
] as const

/** A date as the design extraction read it (`precision` `decade` is Instagram's "1930s"). */
export type DesignDate = {
  readonly display: string | null
  readonly precision: 'exact' | 'circa' | 'decade' | 'none'
  readonly year: number | null
}

/** One line of `old-east-indies/designs/designs.jsonl`. */
export type DesignRecord = {
  readonly code: string
  readonly title: string
  readonly heading: string
  readonly date: DesignDate
  readonly artist: string | null
  readonly catalogues: readonly string[]
  readonly description_en: string
  readonly name_id: string
  readonly description_id: string
  readonly image: { readonly file: string }
}

/** What an Instagram picture is, written beside it in `instagram/products.json` (10.6.e). */
export const IMAGE_KINDS = [
  'artwork',
  'artwork-branded',
  'mockup-mounted',
  'mockup-framed',
] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

/** One entry of `old-east-indies/instagram/products.json` `products[]`. */
export type InstagramRecord = {
  readonly id: string
  readonly title: string
  readonly name_en?: string
  readonly name_id: string
  readonly date: DesignDate
  readonly description_en: string
  readonly description_id: string
  readonly images: ReadonlyArray<{ readonly file: string; readonly kind: ImageKind }>
}

/** A shop category by label, English and Indonesian (the vocabulary seed holds both). */
export type CategoryLabel = { readonly en: string; readonly id: string }

/** One picture of a product, with what it is and how it was made (CONTENT-MODEL.md §6). */
export type ProductImage = {
  readonly path: string
  readonly fileName: string
  readonly kind: ImageKind
  readonly role: 'flat' | 'in-room'
  readonly provenance: 'photograph' | 'composite' | 'rendered'
  readonly altEn: string
  readonly altId: string
}

export type CatalogueVariant = {
  readonly sku: string
  readonly labelEn: string
  readonly labelId: string
  readonly priceIdr: number
}

/** One design, ready to become a products row and two variant rows. */
export type CatalogueProduct = {
  readonly sku: string
  readonly nameEn: string
  readonly nameId: string
  readonly descriptionEn: string
  readonly descriptionId: string
  readonly category: CategoryLabel
  readonly priceIdr: number
  readonly variants: readonly CatalogueVariant[]
  readonly images: readonly ProductImage[]
}

/** The folders the records' relative image paths hang from. */
export type CatalogueDirs = { readonly designs: string; readonly instagram: string }

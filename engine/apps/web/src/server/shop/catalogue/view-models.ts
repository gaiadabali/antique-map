/**
 * The shop catalogue's public view models (6.1.a). What a loader returns — no store id, code or
 * quantity ever reaches a page (COMMERCE.md §4: availability only, computed across active
 * stores), and no price but a whole rupiah integer for `formatRupiah` (COMMERCE.md §2).
 */

import type { SyntheticLabel } from '@engine/media/contract'

/** An image as a page shows it: the public derivative URL (`../media/public-image`), only once
 * the media pipeline has published it — never Payload's staff-only file route — and its alt text. */
export type CatalogueImage = {
  readonly url: string
  readonly alt: string
  readonly width: number | null
  readonly height: number | null
  /** Anything but a photograph is labelled wherever it is shown (CONTENT-MODEL.md �5); null for one. */
  readonly syntheticLabel: SyntheticLabel | null
}

/** A category term a published product points at: the slug its address carries and its label. */
export type CategoryVM = {
  readonly slug: string
  readonly label: string
}

/** A listing card: image, name, price, Reproduction, and Sold out when no store has any. */
export type ProductCardVM = {
  readonly id: number
  readonly slug: string
  readonly name: string
  readonly sku: string
  /** The one list price, whole rupiah; `null` only on an unpublished gap the shop never shows. */
  readonly price: number | null
  /** "From Rp …" — set when variants are priced differently, else the card shows `price`. */
  readonly fromPrice: number | null
  readonly image: CatalogueImage | null
  readonly category: CategoryVM | null
  /** Any active store holds a sellable unit (variants included); computed live, never cached. */
  readonly available: boolean
}

/** One variant option: its label, its own price when it has one, and its live availability. */
export type VariantVM = {
  readonly sku: string
  readonly label: string
  /** The variant's price when it carries one; `null` takes the product's price. */
  readonly price: number | null
  readonly available: boolean
}

/** The antique a product is made from: the gallery item's public id, title and slug, no more. */
export type RelatedWorkVM = {
  readonly publicId: number
  readonly title: string
  readonly slug: string
  /** The gallery host's absolute item URL, built from `SITES`, never from a request. */
  readonly href: string
}

/** A product page's data. */
export type ProductVM = {
  readonly id: number
  readonly slug: string
  readonly name: string
  readonly sku: string
  readonly description: string
  /** The product's list price, whole rupiah; a variant without its own takes it. */
  readonly price: number | null
  readonly images: readonly CatalogueImage[]
  readonly variants: readonly VariantVM[]
  readonly category: CategoryVM | null
  readonly relatedWork: RelatedWorkVM | null
  /** Whether the product — or the chosen variant, in the picker — can be bought today. */
  readonly available: boolean
}

/** One page of a listing, its pagination and its sort already canonical. */
export type ListingVM = {
  readonly items: readonly ProductCardVM[]
  readonly page: number
  readonly pages: number
  readonly total: number
  readonly sort: 'featured' | 'newest' | 'priceAsc' | 'priceDesc'
}

/**
 * The catalogue's cached reads (6.1.a): editorial content — names, images, prices, categories —
 * under `'use cache'`, tagged so one invalidation reaches every page that shows the record.
 *
 * Availability is deliberately absent: it decides a purchase, so `./availability` reads it live
 * in the page's body and the page merges it into these results. Prices here are display values
 * only — the bag and checkout re-price everything on the server (COMMERCE.md §2).
 */
import 'server-only'

import { cacheTag } from 'next/cache'

import { cms } from '@engine/cms/instance'

import { availabilityFor, withAvailability, type ProductAvailability } from './availability'
import {
  getCategories,
  getCategoryId,
  getProduct,
  listProducts,
  productsByIds,
  type ListingSort,
} from './queries'
import { searchProductIds } from './search'
import type { CategoryVM, ListingVM, ProductVM, VariantVM } from './view-models'

/** The whole catalogue's editorial tag: a product edit re-renders the pages that show it. */
const CATALOGUE_TAG = 'products'

function tagCatalogue(): void {
  cacheTag(CATALOGUE_TAG)
}

/** The categories a published product carries, by label. */
export async function categories(): Promise<readonly CategoryVM[]> {
  'use cache'
  tagCatalogue()
  return getCategories(await cms())
}

/** The id of the published term a category page's slug names, or `null`. */
export async function categoryId(slug: string): Promise<number | null> {
  'use cache'
  tagCatalogue()
  return getCategoryId(await cms(), slug)
}

/** One page of the listing (or of a category page), with its live availability merged. */
export async function listing(options: {
  sort?: ListingSort
  categoryId?: number
  page?: number
}): Promise<ListingVM> {
  'use cache'
  tagCatalogue()
  const payload = await cms()
  const result = await listProducts(payload, options)
  const availability = await availabilityFor(
    payload,
    result.items.map((item) => item.id),
  )
  return {
    items: result.items.map((item) => withAvailability(item, availability.get(item.id))),
    page: result.page,
    pages: result.pages,
    total: result.total,
    sort: options.sort ?? 'featured',
  }
}

/**
 * Search: the words, matched by `./search`, projected as cards with live availability.
 * The words are part of the cache key, like the listing's own arguments.
 */
export async function search(options: {
  query: string
  locale: 'en' | 'id'
  sort?: ListingSort
}): Promise<ListingVM> {
  'use cache'
  tagCatalogue()
  const payload = await cms()
  const ids = await searchProductIds(payload, options.query, options.locale)
  if (ids.length === 0) {
    return { items: [], page: 1, pages: 1, total: 0, sort: options.sort ?? 'featured' }
  }
  const result = await productsByIds(payload, ids, options.sort)
  const availability = await availabilityFor(
    payload,
    result.items.map((item) => item.id),
  )
  return {
    items: result.items.map((item) => withAvailability(item, availability.get(item.id))),
    page: result.page,
    pages: result.pages,
    total: result.total,
    sort: options.sort ?? 'featured',
  }
}

/** A product page's data, with its live availability merged into the product and its variants. */
export async function product(
  slug: string,
): Promise<(ProductVM & { variants: readonly (VariantVM & { available: boolean })[] }) | null> {
  'use cache'
  tagCatalogue()
  const payload = await cms()
  const product = await getProduct(payload, slug)
  if (!product) return null
  const [availability] = [...(await availabilityFor(payload, [product.id])).values()]
  return mergeProductAvailability(product, availability)
}

function mergeProductAvailability(
  product: ProductVM,
  availability: ProductAvailability | undefined,
): ProductVM & { variants: readonly VariantVM[] } {
  const variants = product.variants.map((variant) => ({
    ...variant,
    available: availability?.variants.get(variant.sku) ?? false,
  }))
  const unvarianted = availability?.product ?? false
  // A product with variants is available when one of them is; without, through its own row.
  return {
    ...product,
    variants,
    available: product.variants.length === 0 ? unvarianted : variants.some((v) => v.available),
  }
}

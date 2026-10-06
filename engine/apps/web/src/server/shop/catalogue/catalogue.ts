/**
 * The catalogue's cached reads (6.1.a): editorial content — names, images, prices, categories —
 * under `'use cache'`, tagged so one invalidation reaches every page that shows the record.
 *
 * Availability is deliberately absent from every `'use cache'` function: it decides a purchase,
 * so the exported `listing`, `search` and `product` read the cached editorial part, then call
 * `connection()` (request time, never the build) and merge `./availability`'s live answer. A
 * stock change — a sale, an import, an admin count — shows on the next request with no
 * revalidation (`catalogue.cache.test.ts` guards that no cached function reads availability). Prices here are display values
 * only — the bag and checkout re-price everything on the server (COMMERCE.md §2).
 */
import 'server-only'

import { cacheLife } from 'next/cache'
import { connection } from 'next/server'

import { cacheTags, catalogueTag } from '@engine/cache'
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

/** The shop's listings' tag: a change any listing could show re-renders every one. */
const CATALOGUE = catalogueTag('shop')

/** The categories a published product carries, by label. */
export async function categories(): Promise<readonly CategoryVM[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  return getCategories(await cms())
}

/** The id of the published term a category page's slug names, or `null`. */
export async function categoryId(slug: string): Promise<number | null> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  return getCategoryId(await cms(), slug)
}

async function cachedListing(options: { sort?: ListingSort; categoryId?: number; page?: number }) {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  return listProducts(await cms(), options)
}

/** One page of the listing (or of a category page), with its live availability merged. */
export async function listing(options: {
  sort?: ListingSort
  categoryId?: number
  page?: number
}): Promise<ListingVM> {
  const result = await cachedListing(options)
  await connection()
  const availability = await availabilityFor(
    await cms(),
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

async function cachedSearch(options: { query: string; locale: 'en' | 'id'; sort?: ListingSort }) {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  const ids = await searchProductIds(payload, options.query, options.locale)
  if (ids.length === 0) return null
  return productsByIds(payload, ids, options.sort)
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
  const result = await cachedSearch(options)
  if (result === null) {
    return { items: [], page: 1, pages: 1, total: 0, sort: options.sort ?? 'featured' }
  }
  await connection()
  const availability = await availabilityFor(
    await cms(),
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

/** A product page's editorial data (no availability): its metadata reads this, cached. */
export async function productEditorial(slug: string): Promise<ProductVM | null> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  return getProduct(await cms(), slug)
}

/** A product page's data, with its live availability merged into the product and its variants. */
export async function product(
  slug: string,
): Promise<(ProductVM & { variants: readonly (VariantVM & { available: boolean })[] }) | null> {
  const found = await productEditorial(slug)
  if (!found) return null
  await connection()
  const [availability] = [...(await availabilityFor(await cms(), [found.id])).values()]
  return mergeProductAvailability(found, availability)
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

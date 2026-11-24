/**
 * The catalogue's Payload reads (6.1.a), one projection per surface. Every read is published-only
 * and projected: `overrideAccess: false`, `_status: 'published'`, the shop's records alone
 * (`shopOnly`: `site: 'shop'` in today's one database, every record in the shop's own) and an
 * explicit `select` of the fields a page shows — never a store id, code or quantity, which are
 * `stock-levels`' to hold (COMMERCE.md §4) and are read as booleans by `./availability` only.
 *
 * The queries take their `payload` as an argument, so tests drive them on a real database; the
 * `'use cache'` wrappers (`./catalogue`) call these through the process's one instance.
 */
import type { Payload, SelectType, Where } from 'payload'

import { shopOnly } from '@engine/cms-shop/site'

import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'
import { imagesOf } from './images'
import { getRelatedWork } from './related-work'
import type { CategoryVM, ListingVM, ProductCardVM, ProductVM, VariantVM } from './view-models'

const LIST_PAGE_SIZE = 24

/**
 * A projected product doc, as `CARD_SELECT`/`productSelect()` select it. Payload's generic select
 * types answer `unknown` per field, so the mappers validate against this — a cast at the read's
 * edge, checked field by field below.
 */
type ProductDoc = {
  id: number
  slug: string
  name: string
  sku: string
  price: number | null
  createdAt: string
  description?: string | null
  relatedWork?: number | null
  originalStockNumber?: string | null
  category?: unknown
  variants?:
    | readonly { sku: string; label?: string | null; price?: number | null; active?: boolean }[]
    | null
  images?: readonly { image?: unknown }[] | null
}

/** What a listing may be ordered by; `featured` falls back to newest until the CMS ranks. */
export type ListingSort = 'featured' | 'newest' | 'priceAsc' | 'priceDesc'

const SORT_ORDER: Record<ListingSort, string> = {
  featured: '-createdAt',
  newest: '-createdAt',
  priceAsc: 'price',
  priceDesc: '-price',
}

/** The fields a card shows, and nothing else — no stock column, no note, no other site. */
export const CARD_SELECT = {
  name: true,
  slug: true,
  sku: true,
  price: true,
  category: true,
  variants: { sku: true, label: true, price: true, active: true },
  images: { image: { ...PUBLIC_IMAGE_SELECT, provenance: true } },
  createdAt: true,
} as const

/**
 * The product page's fields: the card's plus its story and the antique it is made from — a
 * relationship into `works` in today's one database (`relatedWork`), a stock number the gallery
 * resolves in the shop's own (`originalStockNumber`, PLAN-V2 §4.3). Each config selects its own.
 */
export function productSelect(payload: Pick<Payload, 'collections'>): SelectType {
  const fields = payload.collections?.['products' as never]?.config.flattenedFields ?? []
  const has = (name: string) => fields.some((field) => 'name' in field && field.name === name)
  return {
    ...CARD_SELECT,
    description: true,
    ...(has('relatedWork') ? { relatedWork: true } : {}),
    ...(has('originalStockNumber') ? { originalStockNumber: true } : {}),
  } as SelectType
}

/** What a listing narrows to (TASKS.md 28.2): a category or a set of them, a theme, the best sellers. */
export type ListingFilter = {
  readonly categoryId?: number
  readonly categoryIds?: readonly number[]
  readonly themeId?: number
  readonly bestSeller?: boolean
}

const publishedShopProducts = (payload: Payload, filter: ListingFilter = {}): Where => ({
  and: [
    { _status: { equals: 'published' } },
    ...[shopOnly(payload, 'products') ?? []].flat(),
    ...(filter.categoryId === undefined ? [] : [{ category: { equals: filter.categoryId } }]),
    ...(filter.categoryIds === undefined ? [] : [{ category: { in: [...filter.categoryIds] } }]),
    ...(filter.themeId === undefined ? [] : [{ themes: { contains: filter.themeId } }]),
    ...(filter.bestSeller ? [{ bestSeller: { equals: true } }] : []),
  ],
})

/** "From Rp …": the lowest price on offer, or `null` when every option costs the same. */
function fromPriceOf(doc: {
  price: number | null
  variants?: readonly { price?: number | null; active?: boolean }[] | null
}): number | null {
  const prices = (doc.variants ?? [])
    .filter((variant) => variant.active !== false && typeof variant.price === 'number')
    .map((variant) => variant.price as number)
  if (prices.length === 0) return null
  const lowest = Math.min(...prices, ...(doc.price === null ? [] : [doc.price]))
  const highest = Math.max(...prices, ...(doc.price === null ? [] : [doc.price]))
  return lowest === highest ? null : lowest
}

/** A product's category as a page shows it, from the category Payload populated. */
function categoryOf(doc: { category?: unknown }): CategoryVM | null {
  if (typeof doc.category !== 'object' || doc.category === null) return null
  const term = doc.category as { slug?: unknown; label?: unknown }
  if (typeof term.slug !== 'string' || typeof term.label !== 'string') return null
  return { slug: term.slug, label: term.label }
}

/**
 * The shop's published categories that hold at least one published product, in the order the
 * CMS gives them (its order, then name).
 */
export async function getCategories(payload: Payload): Promise<readonly CategoryVM[]> {
  const [categories, products] = await Promise.all([
    payload.find({
      collection: 'categories',
      overrideAccess: false,
      where: { _status: { equals: 'published' } },
      select: { slug: true, label: true },
      sort: ['_order', 'label'],
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'products',
      overrideAccess: false,
      where: publishedShopProducts(payload),
      select: { category: true },
      pagination: false,
      depth: 0,
    }),
  ])
  const used = new Set(
    (products.docs as readonly { category?: unknown }[]).map((doc) => Number(doc.category)),
  )
  return (categories.docs as readonly { id: number; slug?: unknown; label?: unknown }[])
    .filter((doc) => used.has(doc.id))
    .flatMap((doc) =>
      typeof doc.slug === 'string' && typeof doc.label === 'string'
        ? [{ slug: doc.slug, label: doc.label }]
        : [],
    )
}

/** The id of the published category a category page's slug names, or `null` when there is none. */
export async function getCategoryId(payload: Payload, slug: string): Promise<number | null> {
  const { docs } = await payload.find({
    collection: 'categories',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    select: { id: true },
    limit: 1,
    depth: 0,
  })
  return (docs as readonly { id: number }[])[0]?.id ?? null
}

/** One page of products, projected to cards. Availability is the caller's: it is never cached. */
export async function listProducts(
  payload: Payload,
  options: ListingFilter & { sort?: ListingSort; page?: number; pageSize?: number } = {},
): Promise<Omit<ListingVM, 'sort' | 'items'> & { items: readonly ProductCardVM[] }> {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? LIST_PAGE_SIZE
  const sort: ListingSort = options.sort ?? 'featured'
  const result = await payload.find({
    collection: 'products',
    overrideAccess: false,
    where: publishedShopProducts(payload, options),
    sort: SORT_ORDER[sort],
    page,
    limit: pageSize,
    select: CARD_SELECT,
    depth: 1,
  })
  const items = (result.docs as unknown as readonly ProductDoc[]).map((doc) => ({
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    sku: doc.sku,
    price: doc.price ?? null,
    fromPrice: fromPriceOf(doc),
    image: imagesOf(doc)[0] ?? null,
    category: categoryOf(doc),
    // The listing's cached read carries no availability: the page merges the live answer.
    available: false,
  }))
  return { items, page, pages: result.totalPages, total: result.totalDocs }
}

/** The cards for the ids a search matched, in the search's order, all of them on one page. */
export async function productsByIds(
  payload: Payload,
  ids: readonly number[],
  sort?: ListingSort,
): Promise<{ items: readonly ProductCardVM[]; page: 1; pages: 1; total: number }> {
  const result = await payload.find({
    collection: 'products',
    overrideAccess: false,
    where: { and: [publishedShopProducts(payload), { id: { in: ids } }] },
    ...(sort ? { sort: SORT_ORDER[sort] } : {}),
    limit: 200,
    select: CARD_SELECT,
    depth: 1,
  })
  const docs = result.docs as unknown as readonly ProductDoc[]
  const byId = new Map(docs.map((doc) => [doc.id, doc]))
  const ordered = ids.flatMap((id) => byId.get(id) ?? [])
  const items = ordered.map((doc) => ({
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    sku: doc.sku,
    price: doc.price ?? null,
    fromPrice: fromPriceOf(doc),
    image: imagesOf(doc)[0] ?? null,
    category: categoryOf(doc),
    available: false, // merged with the live answer by the caller
  }))
  return { items, page: 1, pages: 1, total: items.length }
}

/**
 * A product by its slug in the page's language, or `null`: nothing at that address. A field with
 * no Indonesian text falls back to the English.
 */
export async function getProduct(
  payload: Payload,
  slug: string,
  locale: 'en' | 'id' = 'en',
): Promise<ProductVM | null> {
  const { docs } = await payload.find({
    collection: 'products',
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
    where: {
      and: [publishedShopProducts(payload), { slug: { equals: slug } }],
    },
    select: productSelect(payload),
    depth: 1,
    limit: 1,
  })
  const doc = (docs as unknown as readonly ProductDoc[])[0]
  if (!doc) return null
  const variants: VariantVM[] = (doc.variants ?? [])
    .filter((variant) => variant.active !== false)
    .map((variant) => ({
      sku: variant.sku,
      label: variant.label ?? variant.sku,
      price: variant.price ?? null,
      available: false, // merged with the live answer by the caller
    }))
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    sku: doc.sku,
    description: doc.description ?? '',
    price: doc.price ?? null,
    images: imagesOf(doc),
    variants,
    category: categoryOf(doc),
    relatedWork: doc.relatedWork ? await getRelatedWork(payload, doc.relatedWork) : null,
    originalStockNumber: doc.originalStockNumber?.trim() || null,
    available: false, // merged with the live answer by the caller
  }
}

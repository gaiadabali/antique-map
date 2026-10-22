/**
 * The catalogue's Payload reads (6.1.a), one projection per surface. Every read is published-only
 * and projected: `overrideAccess: false`, `_status: 'published'`, `site: 'shop'` (DR-1) and an
 * explicit `select` of the fields a page shows — never a store id, code or quantity, which are
 * `stock-levels`' to hold (COMMERCE.md §4) and are read as booleans by `./availability` only.
 *
 * The queries take their `payload` as an argument, so tests drive them on a real database; the
 * `'use cache'` wrappers (`./catalogue`) call these through the process's one instance.
 */
import type { Payload, Where } from 'payload'

import { createHref, SITES } from '@engine/config/sites'

import { PUBLIC_IMAGE_SELECT } from '../../media/public-image'
import { imagesOf } from './images'
import type {
  CategoryVM,
  ListingVM,
  ProductCardVM,
  ProductVM,
  RelatedWorkVM,
  VariantVM,
} from './view-models'

const LIST_PAGE_SIZE = 24

/**
 * A projected product doc, as `CARD_SELECT`/`PRODUCT_SELECT` select it. Payload's generic select
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

/** The product page's fields: the card's plus its story and the work it is made from. */
export const PRODUCT_SELECT = { ...CARD_SELECT, description: true, relatedWork: true } as const

const publishedShopProducts = (categoryId?: number): Where => ({
  and: [
    { _status: { equals: 'published' } },
    { site: { equals: 'shop' } },
    ...(categoryId === undefined ? [] : [{ category: { equals: categoryId } }]),
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
      sort: ['position', 'label'],
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'products',
      overrideAccess: false,
      where: publishedShopProducts(),
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
  options: { sort?: ListingSort; categoryId?: number; page?: number; pageSize?: number } = {},
): Promise<Omit<ListingVM, 'sort' | 'items'> & { items: readonly ProductCardVM[] }> {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? LIST_PAGE_SIZE
  const sort: ListingSort = options.sort ?? 'featured'
  const result = await payload.find({
    collection: 'products',
    overrideAccess: false,
    where: publishedShopProducts(options.categoryId),
    sort: SORT_ORDER[sort],
    page,
    limit: pageSize,
    select: CARD_SELECT,
    depth: 1,
  })
  const items = (result.docs as readonly ProductDoc[]).map((doc) => ({
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
    where: { and: [publishedShopProducts(), { id: { in: ids } }] },
    ...(sort ? { sort: SORT_ORDER[sort] } : {}),
    limit: 200,
    select: CARD_SELECT,
    depth: 1,
  })
  const docs = result.docs as readonly ProductDoc[]
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
      and: [publishedShopProducts(), { slug: { equals: slug } }],
    },
    select: PRODUCT_SELECT,
    depth: 1,
    limit: 1,
  })
  const doc = (docs as readonly ProductDoc[])[0]
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
    available: false, // merged with the live answer by the caller
  }
}

/** The antique a product is made from: its public id and title only, linked on the gallery's host. */
export async function getRelatedWork(
  payload: Payload,
  workId: number,
): Promise<RelatedWorkVM | null> {
  const { docs } = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { id: { equals: workId } }] },
    select: { publicId: true, title: true, slug: true },
    limit: 1,
    depth: 0,
  })
  const work = docs[0]
  if (!work || typeof work.publicId !== 'number' || typeof work.title !== 'string') return null
  const slug = typeof work.slug === 'string' ? work.slug : ''
  return {
    publicId: work.publicId,
    title: work.title,
    slug,
    href: relatedWorkHref(work.publicId, slug),
  }
}

/**
 * The gallery item's absolute URL, built from `SITES`' gallery route map — never from a request.
 * English path: the gallery serves both locales and the product page links in the visitor's
 * language only in its words; TODO(9.3) locale-aware cross-site hrefs arrive with the SEO wave.
 */
function relatedWorkHref(publicId: number, slug: string): string {
  const href = createHref(SITES.gallery)
  const path =
    slug === ''
      ? href('item', { publicId, slug: '' }, 'en')
      : href('item', { publicId, slug }, 'en')
  return `https://${SITES.gallery.hostnames.production[0]}${path}`
}

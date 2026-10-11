/**
 * What the Catalogue Wall reads (TASKS.md 16.2). Every read is the Local API with
 * `overrideAccess: false` and the signed-in user, and `draft: true` so an unpublished edit shows
 * as the draft it is; `select` and `populate` name the few fields a card shows, so a price, a
 * note or a master never leaves the database for a card.
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload, Where } from 'payload'

import { AI_DRAFTABLE_FIELDS, unverifiedAiDraft } from '../../collections/works/vocabulary'
import { rowsOf } from '../dashboard/sql'
import { PAGE_SIZE, type WallFilter } from './filter'
import { thumbnailUrl } from './image'
import { deriveProductState, deriveWorkState, type WallStateTag } from './state'

export type WallCard = {
  readonly key: string
  readonly kind: 'work' | 'product'
  readonly id: number | string
  readonly href: string
  readonly title: string
  /** Stock number (a work) or SKU (a product). */
  readonly reference: string
  readonly tag: WallStateTag
  readonly image: string | null
  readonly updatedAt: string
}

export type WallPage = {
  readonly cards: readonly WallCard[]
  readonly total: number
  readonly pages: number
}

type Ctx = { payload: Payload; user: unknown; locale?: string }
// A Payload document read with `select`: only the fields named there are present.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>

const draft: Where = { _status: { equals: 'draft' } }

/** A work with a drafted field no one has verified: `drafted` on and `verifiedAt` still empty. */
export const aiPending: Where = {
  or: AI_DRAFTABLE_FIELDS.map((field) => ({
    and: [
      { [`cataloguing.aiDraft.${field}.drafted`]: { equals: true } },
      { [`cataloguing.aiDraft.${field}.verifiedAt`]: { exists: false } },
    ],
  })),
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Units for sale in any store, by product id: one batched read for the whole page. */
async function stockOf(ctx: Ctx, ids: readonly (number | string)[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  if (ids.length === 0) return totals
  const rows = await ctx.payload.find({
    collection: 'stock-levels',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user: ctx.user as never,
    select: { product: true, quantity: true },
    where: { product: { in: [...ids] } },
  })
  for (const row of rows.docs as Doc[]) {
    const key = String(typeof row.product === 'object' ? row.product?.id : row.product)
    totals.set(key, (totals.get(key) ?? 0) + (Number(row.quantity) || 0))
  }
  return totals
}

/** Products with at least one unit in some store; the rest are out of stock. */
async function productIdsInStock(ctx: Ctx): Promise<number[]> {
  const rows = await rowsOf<{ product_id: unknown }>(
    ctx.payload,
    sql`SELECT DISTINCT product_id FROM stock_levels WHERE quantity > 0`,
  )
  return rows.map((row) => Number(row.product_id))
}

function match(filter: WallFilter, fields: string[]): Where | null {
  if (filter.q === '') return null
  return { or: fields.map((field) => ({ [field]: { like: filter.q } })) }
}

async function workWhere(filter: WallFilter): Promise<Where | null> {
  const noImage: Where = { 'images.media': { exists: false } }
  const parts: Where[] = []
  const state = {
    all: null,
    attention: { or: [draft, noImage, aiPending] },
    drafts: draft,
    published: { _status: { equals: 'published' } },
    sold: { status: { equals: 'sold' } },
    ai: aiPending,
  }[filter.state] as Where | null
  if (state) parts.push(state)
  const search = match(filter, ['title', 'stockNumber'])
  if (search) parts.push(search)
  return parts.length === 0 ? {} : { and: parts }
}

async function productWhere(ctx: Ctx, filter: WallFilter): Promise<Where | null> {
  if (filter.state === 'ai') return null
  const parts: Where[] = []
  if (filter.state === 'attention') {
    parts.push({ or: [draft, { 'images.image': { exists: false } }] })
  } else if (filter.state === 'drafts') parts.push(draft)
  else if (filter.state === 'published') parts.push({ _status: { equals: 'published' } })
  else if (filter.state === 'sold') {
    // Out of stock means a live product with no unit anywhere; a draft is not on sale to run out.
    parts.push({ _status: { equals: 'published' } })
    const inStock = await productIdsInStock(ctx)
    if (inStock.length > 0) parts.push({ id: { not_in: inStock } })
  }
  const search = match(filter, ['name', 'sku'])
  if (search) parts.push(search)
  return parts.length === 0 ? {} : { and: parts }
}

async function readWorks(ctx: Ctx, where: Where, page: number, limit: number) {
  const result = await ctx.payload.find({
    collection: 'works',
    depth: 1,
    draft: true,
    limit,
    page,
    sort: '-updatedAt',
    overrideAccess: false,
    user: ctx.user as never,
    ...(ctx.locale ? { locale: ctx.locale as never } : {}),
    where,
    select: {
      title: true,
      stockNumber: true,
      status: true,
      _status: true,
      updatedAt: true,
      images: true,
      cataloguing: { aiDraft: true },
    } as never,
    populate: {
      media: { url: true, thumbnailURL: true, width: true, assetId: true, derivatives: true },
    } as never,
  })
  const cards: WallCard[] = (result.docs as Doc[]).map((doc) => {
    const media = doc.images?.[0]?.media
    const image = media && typeof media === 'object' ? thumbnailUrl(media) : null
    return {
      key: `work-${doc.id}`,
      kind: 'work',
      id: doc.id,
      href: `/admin/collections/works/${doc.id}`,
      title: text(doc.title),
      reference: text(doc.stockNumber),
      tag: deriveWorkState({
        draft: doc._status === 'draft',
        hasImage: Boolean(media),
        unverifiedAiDrafts: unverifiedAiDraft(doc.cataloguing?.aiDraft).length,
        availability: doc.status,
      }),
      image,
      updatedAt: text(doc.updatedAt),
    }
  })
  return { cards, total: result.totalDocs ?? cards.length }
}

async function readProducts(ctx: Ctx, where: Where, page: number, limit: number) {
  const result = await ctx.payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit,
    page,
    sort: '-updatedAt',
    overrideAccess: false,
    user: ctx.user as never,
    ...(ctx.locale ? { locale: ctx.locale as never } : {}),
    where,
    select: { name: true, sku: true, _status: true, updatedAt: true, images: true } as never,
    populate: {
      media: { url: true, thumbnailURL: true, width: true, assetId: true, derivatives: true },
    } as never,
  })
  const docs = result.docs as Doc[]
  // One batched read for the page's products, never one per card.
  const stock = await stockOf(
    ctx,
    docs.map((doc) => doc.id),
  )
  const cards: WallCard[] = docs.map((doc) => {
    const media = doc.images?.[0]?.image
    return {
      key: `product-${doc.id}`,
      kind: 'product',
      id: doc.id,
      href: `/admin/collections/products/${doc.id}`,
      title: text(doc.name),
      reference: text(doc.sku),
      tag: deriveProductState({
        draft: doc._status === 'draft',
        hasImage: Boolean(media),
        stock: stock.get(String(doc.id)) ?? 0,
      }),
      image: media && typeof media === 'object' ? thumbnailUrl(media) : null,
      updatedAt: text(doc.updatedAt),
    }
  })
  return { cards, total: result.totalDocs ?? cards.length }
}

/**
 * One page of the wall, newest edit first. For one site it is a single indexed page. For
 * `site=all` the two collections cannot be paged as one, so each is read up to `page × 24` rows
 * (page 1 each, newest first), merged by `updatedAt` and cut to the page's window: the cost grows
 * with the page number, at most 2 × `MAX_PAGE` × 24 narrow rows (`MAX_PAGE` bounds it), and page 1,
 * where nearly every visit lands, reads 48.
 */
export async function loadWall(ctx: Ctx, filter: WallFilter): Promise<WallPage> {
  const empty = { cards: [] as WallCard[], total: 0 }
  const works = filter.site === 'shop' ? null : await workWhere(filter)
  const products = filter.site === 'gallery' ? null : await productWhere(ctx, filter)
  let cards: WallCard[]
  let total: number
  if (filter.site === 'all') {
    const depth = filter.page * PAGE_SIZE
    const [w, p] = await Promise.all([
      works ? readWorks(ctx, works, 1, depth) : empty,
      products ? readProducts(ctx, products, 1, depth) : empty,
    ])
    const merged = [...w.cards, ...p.cards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    cards = merged.slice((filter.page - 1) * PAGE_SIZE, filter.page * PAGE_SIZE)
    total = w.total + p.total
  } else {
    const read = filter.site === 'gallery' ? works : products
    const result = !read
      ? empty
      : filter.site === 'gallery'
        ? await readWorks(ctx, read, filter.page, PAGE_SIZE)
        : await readProducts(ctx, read, filter.page, PAGE_SIZE)
    cards = result.cards
    total = result.total
  }
  return { cards, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

/** The strip's two catalogue counts: drafts across both collections, AI drafts to check. */
export async function loadCatalogueCounts(ctx: Ctx): Promise<{ drafts: number; aiDrafts: number }> {
  const count = async (collection: 'works' | 'products', where: Where): Promise<number> => {
    try {
      const result = await ctx.payload.find({
        collection,
        depth: 0,
        draft: true,
        limit: 0,
        overrideAccess: false,
        user: ctx.user as never,
        where,
      })
      return result.totalDocs ?? 0
    } catch {
      return 0
    }
  }
  const [workDrafts, productDrafts, aiDrafts] = await Promise.all([
    count('works', draft),
    count('products', draft),
    count('works', aiPending),
  ])
  return { drafts: workDrafts + productDrafts, aiDrafts }
}

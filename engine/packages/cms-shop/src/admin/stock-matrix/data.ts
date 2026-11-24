/**
 * What the stock matrix reads (TASKS.md 27.4.b), on the Local API **as the person** —
 * `overrideAccess: false` with their user — so the collections' own access decides what comes
 * back: store staff get their own store and its rows alone (`collections/stores`,
 * `collections/stock-levels/access`), whatever the address asks for. Only the low-stock threshold
 * is read past access: one number of the owner's settings, projected alone, which every staff
 * member's screen needs to mark a low count.
 *
 * One page is four reads: the stores (the columns, ten a page when every store is shown), the products of the page (25, by name, found
 * by name or SKU — the product's or a variant's), the page's stock rows, and — under the low
 * filter — the products holding a row at or below the threshold in the shown stores.
 */
import { roleOf } from '@engine/cms-core/access'
import type { Payload, TypedUser, Where } from 'payload'

import { DEFAULT_LOW_STOCK_THRESHOLD } from '../../globals/site-settings/shop'
import type { Id, StockStore } from '../products/stock-grid'
import {
  linesOf,
  lowLines,
  PAGE_SIZE,
  storeColumns,
  type MatrixLine,
  type MatrixProduct,
  type MatrixQuery,
  type MatrixRow,
} from './grid'

type Doc = Record<string, unknown> & { id: Id }
type User = TypedUser | null | undefined

const idOf = (value: unknown): Id | null => {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'number' || (typeof id === 'string' && id !== '') ? id : null
}
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export type Matrix = {
  /** Every store the person may count at (the store picker's list). */
  readonly allStores: StockStore[]
  /** The columns shown: a page of ten stores (`./grid` `STORES_PER_PAGE`), or the one picked. */
  readonly stores: StockStore[]
  readonly storePages: number
  readonly lines: MatrixLine[]
  readonly rows: MatrixRow[]
  readonly threshold: number
  readonly page: number
  readonly totalPages: number
  readonly totalProducts: number
}

/** The global low-stock line (the plan's K8). */
export async function lowStockThreshold(payload: Payload): Promise<number> {
  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
    select: { shop: { lowStockThreshold: true } },
  } as never)) as { shop?: { lowStockThreshold?: unknown } }
  const value = settings?.shop?.lowStockThreshold
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : DEFAULT_LOW_STOCK_THRESHOLD
}

async function storesFor(payload: Payload, user: User): Promise<StockStore[]> {
  // A store user's read is their own store, active or not; everyone else counts at open stores.
  const where: Where | undefined =
    roleOf(user) === 'store' ? undefined : { active: { equals: true } }
  const found = await payload.find({
    collection: 'stores',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    sort: 'name',
    select: { name: true, code: true },
    ...(where ? { where } : {}),
  })
  return (found.docs as Doc[]).map((doc) => ({
    id: doc.id,
    name: text(doc.name) || text(doc.code),
    code: text(doc.code),
  }))
}

/** The products with a row at or below the threshold at one of `stores`. */
async function lowProductIds(
  payload: Payload,
  user: User,
  stores: readonly StockStore[],
  threshold: number,
): Promise<Id[]> {
  const found = await payload.find({
    collection: 'stock-levels',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    select: { product: true },
    where: {
      and: [
        { quantity: { less_than_equal: threshold } },
        { store: { in: stores.map((store) => store.id) } },
      ],
    },
  })
  const ids = new Set<Id>()
  for (const doc of found.docs as Doc[]) {
    const id = idOf(doc.product)
    if (id !== null) ids.add(id)
  }
  return [...ids]
}

function productsWhere(query: MatrixQuery, lowIds: Id[] | null): Where {
  const and: Where[] = []
  if (query.q) {
    and.push({
      or: [
        { name: { like: query.q } },
        { sku: { contains: query.q } },
        { 'variants.sku': { contains: query.q } },
      ],
    })
  }
  if (lowIds) and.push({ id: { in: lowIds } })
  return and.length > 0 ? { and } : {}
}

export async function matrixData(
  payload: Payload,
  user: User,
  query: MatrixQuery,
  locale: 'en' | 'id',
): Promise<Matrix> {
  const empty = { lines: [], rows: [], page: 1, totalPages: 0, totalProducts: 0 }
  const allStores = user ? await storesFor(payload, user) : []
  const threshold = await lowStockThreshold(payload)
  const picked = allStores.filter((store) => String(store.id) === query.store)
  const columns = storeColumns(allStores, query.cols)
  const stores = picked.length > 0 ? picked : columns.shown
  const storePages = picked.length > 0 ? 1 : columns.pages
  if (!user || stores.length === 0) return { allStores, stores, storePages, threshold, ...empty }

  const lowIds = query.low ? await lowProductIds(payload, user, stores, threshold) : null
  if (lowIds && lowIds.length === 0) return { allStores, stores, storePages, threshold, ...empty }

  const products = await payload.find({
    collection: 'products',
    depth: 0,
    limit: PAGE_SIZE,
    page: query.page,
    overrideAccess: false,
    user,
    locale,
    fallbackLocale: 'en',
    sort: 'name',
    select: { name: true, sku: true, variants: { sku: true, label: true } },
    where: productsWhere(query, lowIds),
  })
  const page: MatrixProduct[] = (products.docs as Doc[]).map((doc) => ({
    id: doc.id,
    name: text(doc.name) || text(doc.sku),
    sku: text(doc.sku),
    variants: (Array.isArray(doc.variants) ? doc.variants : []).map((variant) => ({
      sku: text((variant as Doc).sku),
      label: text((variant as Doc).label),
    })),
  }))

  const found =
    page.length === 0
      ? { docs: [] }
      : await payload.find({
          collection: 'stock-levels',
          depth: 0,
          limit: 0,
          pagination: false,
          overrideAccess: false,
          user,
          select: { store: true, product: true, variantSku: true, quantity: true },
          where: {
            and: [
              { product: { in: page.map((product) => product.id) } },
              { store: { in: stores.map((store) => store.id) } },
            ],
          },
        })
  const rows: MatrixRow[] = (found.docs as Doc[]).flatMap((doc) => {
    const store = idOf(doc.store)
    const product = idOf(doc.product)
    if (store === null || product === null) return []
    const variantSku = text(doc.variantSku)
    return [
      {
        id: doc.id,
        store,
        product,
        variantSku: variantSku === '' ? null : variantSku,
        quantity: Number(doc.quantity) || 0,
      },
    ]
  })
  const all = linesOf(page, query.q)
  return {
    allStores,
    stores,
    storePages,
    lines: query.low ? lowLines(all, rows, threshold) : all,
    rows,
    threshold,
    page: products.page ?? query.page,
    totalPages: products.totalPages,
    totalProducts: products.totalDocs,
  }
}

/**
 * What the product editor and the product list read (TASKS.md 27.2.d), on the Local API **as the
 * person** — `overrideAccess: false` with their user — so the collections' own access decides what
 * comes back: store staff get their own store and its rows alone (`collections/stores`,
 * `collections/stock-levels/access`), whatever the screen asks for.
 *
 * - `stockTable` — the stores and this product's stock rows, for the stores × variants table;
 * - `stockTotals` — each listed product's units across the stores the person may read, one query
 *   for a page of products (`totalsBatch` gathers the list's cells into it);
 * - `outOfStockIds` — the "Out of stock" quick filter: products no store holds a unit of. Payload
 *   cannot ask "no related row", so it is one SQL statement — run only for a person whose stock
 *   read is every row (`ownStoreRows` answers `true`: the owner and the editors); for anyone else
 *   there is no such filter, rather than a store-blind answer.
 */
import type { Payload, TypedUser, Where } from 'payload'

import { ownStoreRows } from '../../collections/stock-levels/access'
import { rowsOf, sql } from '@engine/cms-core/admin/dashboard/sql'
import { THUMBNAIL_SELECT, thumbnailUrl } from '@engine/cms-core/admin/image'
import type { Id, StockRow, StockStore } from './stock-grid'

type Doc = Record<string, unknown> & { id: Id }
type User = TypedUser | null | undefined

const idOf = (value: unknown): Id | null => {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'number' || (typeof id === 'string' && id !== '') ? id : null
}
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export type StockTable = { stores: StockStore[]; rows: StockRow[] }

/** The stores the person may read — taking orders, or already holding this product — and its rows. */
export async function stockTable(payload: Payload, user: User, product: Id): Promise<StockTable> {
  if (!user) return { stores: [], rows: [] }
  const found = await payload.find({
    collection: 'stock-levels',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    select: { store: true, variantSku: true, quantity: true },
    where: { product: { equals: product } },
  })
  const rows: StockRow[] = (found.docs as Doc[]).flatMap((doc) => {
    const store = idOf(doc.store)
    if (store === null) return []
    const variantSku = text(doc.variantSku)
    return [
      {
        id: doc.id,
        store,
        variantSku: variantSku === '' ? null : variantSku,
        quantity: Number(doc.quantity) || 0,
      },
    ]
  })
  const holding = [...new Set(rows.map((row) => row.store))]
  const where: Where = {
    or: [{ active: { equals: true } }, ...(holding.length ? [{ id: { in: holding } }] : [])],
  }
  const stores = await payload.find({
    collection: 'stores',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    sort: 'name',
    select: { name: true, code: true },
    where,
  })
  return {
    stores: (stores.docs as Doc[]).map((doc) => ({
      id: doc.id,
      name: text(doc.name) || text(doc.code),
      code: text(doc.code),
    })),
    rows,
  }
}

/** Each product's units across the stock rows the person may read (0 when none). */
export async function stockTotals(
  payload: Payload,
  user: User,
  ids: readonly Id[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>(ids.map((id) => [String(id), 0]))
  if (!user || ids.length === 0) return totals
  const found = await payload.find({
    collection: 'stock-levels',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    select: { product: true, quantity: true },
    where: { product: { in: [...ids] } },
  })
  for (const doc of found.docs as Doc[]) {
    const key = String(idOf(doc.product))
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + (Number(doc.quantity) || 0))
  }
  return totals
}

/**
 * One query for the ids asked for in the same turn: each list cell asks for its own product, and
 * the first ask waits a tick so the others join it. An id asked for after the batch left gets a
 * batch of its own.
 */
export function totalsBatch(load: (ids: Id[]) => Promise<Map<string, number>>) {
  let pending: { ids: Set<Id>; result: Promise<Map<string, number>> } | null = null
  return async (id: Id): Promise<number> => {
    if (!pending) {
      const ids = new Set<Id>()
      const result = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
        pending = null
        return load([...ids])
      })
      pending = { ids, result }
    }
    pending.ids.add(id)
    return (await pending.result).get(String(id)) ?? 0
  }
}

/** Products no readable store holds a unit of; null when the person's stock read is not every row. */
export async function outOfStockIds(payload: Payload, user: User): Promise<number[] | null> {
  if (!user) return null
  const access = await ownStoreRows({ req: { user, payload } } as never)
  if (access !== true) return null
  const rows = await rowsOf<{ id: unknown }>(
    payload,
    sql`SELECT p.id FROM products p WHERE NOT EXISTS (SELECT 1 FROM stock_levels s WHERE s.product_id = p.id AND s.quantity > 0) ORDER BY p.id`,
  )
  return rows.map((row) => Number(row.id))
}

/** The first photo's thumbnail of a listed product: the public derivative, else the staff file. */
export async function coverOf(
  payload: Payload,
  user: User,
  images: unknown,
): Promise<string | null> {
  const first = Array.isArray(images) ? (images[0] as { image?: unknown } | undefined)?.image : null
  if (first && typeof first === 'object' && ('url' in first || 'assetId' in first)) {
    return thumbnailUrl(first)
  }
  const id = idOf(first)
  if (id === null || !user) return null
  const media = await payload
    .findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: false,
      user,
      disableErrors: true,
      select: THUMBNAIL_SELECT,
    })
    .catch(() => null)
  return media ? thumbnailUrl(media) : null
}

/** Thumbnails for an editor's saved photos, by media id, read as the person. */
export async function photoThumbs(
  payload: Payload,
  user: User,
  ids: readonly Id[],
  locale?: string,
): Promise<Record<string, { url: string | null; alt: string }>> {
  if (!user || ids.length === 0) return {}
  const found = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user,
    ...(locale && locale !== 'all' ? { locale: locale as never } : {}),
    select: { ...THUMBNAIL_SELECT, alt: true },
    where: { id: { in: [...ids] } },
  })
  return Object.fromEntries(
    (found.docs as Doc[]).map((doc) => [
      String(doc.id),
      { url: thumbnailUrl(doc), alt: text(doc.alt) },
    ]),
  )
}

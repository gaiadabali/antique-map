/**
 * The orders inbox's and order page's reads (TASKS.md 27.3): the Local API only, as the signed-in
 * user (`overrideAccess: false`), so a store user's tabs, counts, search results, order and store
 * are their own store's alone — the collections' access rules decide, never a `where` here.
 *
 * - `loadInbox` — one tab's page of orders and every tab's count, with the search applied to all;
 * - `loadStoreCard` — the order's store: its name, area and the store's own WhatsApp (staff only);
 * - `loadReassignOptions` — every other active store, nearest the pin first, each saying whether
 *   it holds every item of the order right now (its stock rows ≥ each line's quantity) — what the
 *   reassign sheet offers. The core (`reassignOrder`) still takes the stock atomically and refuses
 *   a store that cannot fill the order: this is a read for the person, never a decision.
 */
import type { Payload, PayloadRequest } from 'payload'

import { haversineKm } from '../../shop/orders/geo'
import type { OrderRow } from './data'
import { INBOX_TABS, searchWhere, tabSort, tabWhere, type InboxTab } from './inbox'

/** What a row of the inbox shows. */
export type InboxRow = Pick<
  OrderRow,
  'id' | 'number' | 'status' | 'contact' | 'totals' | 'needsAttention' | 'channel' | 'expiresAt'
> & {
  readonly storeSnapshot?: { readonly name?: string | null } | null
  readonly createdAt: string
}

const INBOX_SELECT = {
  number: true,
  status: true,
  contact: { name: true, whatsapp: true },
  totals: { total: true },
  storeSnapshot: { name: true },
  needsAttention: { flag: true },
  channel: true,
  expiresAt: true,
  createdAt: true,
} as const

export const INBOX_PAGE_SIZE = 30

export type Inbox = {
  readonly rows: readonly InboxRow[]
  readonly counts: Readonly<Record<InboxTab, number>>
  readonly page: number
  readonly totalPages: number
}

export async function loadInbox(
  payload: Payload,
  req: PayloadRequest,
  query: { tab: InboxTab; q: string; store: number | null; page: number },
): Promise<Inbox> {
  const search = searchWhere(query.q)
  const as = { collection: 'orders' as const, overrideAccess: false, user: req.user, req }
  const [counts, list] = await Promise.all([
    Promise.all(
      INBOX_TABS.map(async (tab) => {
        const { totalDocs } = await payload.count({
          ...as,
          where: tabWhere(tab, search, query.store),
        })
        return [tab, totalDocs] as const
      }),
    ),
    payload.find({
      ...as,
      depth: 0,
      limit: INBOX_PAGE_SIZE,
      page: query.page > 0 ? query.page : 1,
      select: INBOX_SELECT,
      sort: tabSort(query.tab),
      where: tabWhere(query.tab, search, query.store),
    }),
  ])
  return {
    rows: list.docs as unknown as InboxRow[],
    counts: Object.fromEntries(counts) as Record<InboxTab, number>,
    page: list.page ?? 1,
    totalPages: list.totalPages,
  }
}

export type StoreCard = {
  readonly id: number
  readonly name: string
  readonly area: string | null
  /** The store's own number (staff only); `null` when unset or not readable. */
  readonly whatsapp: string | null
}

export async function loadStoreCard(
  payload: Payload,
  req: PayloadRequest,
  storeId: number | null,
): Promise<StoreCard | null> {
  if (storeId === null) return null
  const store = (await payload.findByID({
    collection: 'stores',
    id: storeId,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
    select: { name: true, area: true, whatsapp: true },
    disableErrors: true,
  })) as { name?: string; area?: string | null; whatsapp?: string | null } | null
  if (!store) return null
  return {
    id: storeId,
    name: store.name ?? '—',
    area: store.area ?? null,
    whatsapp: typeof store.whatsapp === 'string' && store.whatsapp !== '' ? store.whatsapp : null,
  }
}

export type ReassignOption = {
  readonly id: number
  readonly name: string
  readonly area: string | null
  /** Straight-line km from the store to the order's pin, to 0.1. */
  readonly distanceKm: number
  /** The store's stock holds every line of the order right now. */
  readonly holdsAll: boolean
}

type LineKey = { productId: number; variantSku: string | null; qty: number }

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : typeof (value as { id?: unknown } | null)?.id === 'number'
      ? ((value as { id: number }).id ?? null)
      : null

function orderLines(order: OrderRow): LineKey[] {
  return order.lines
    .map((line) => ({
      productId: idOf(line.product),
      variantSku: typeof line.variantSku === 'string' ? line.variantSku : null,
      qty: Number(line.qty) || 1,
    }))
    .filter((line): line is LineKey => line.productId !== null)
}

export async function loadReassignOptions(
  payload: Payload,
  req: PayloadRequest,
  order: OrderRow,
): Promise<readonly ReassignOption[]> {
  const current = idOf(order.store)
  const pin = { lat: Number(order.delivery.lat), lng: Number(order.delivery.lng) }
  const lines = orderLines(order)
  const as = { overrideAccess: false, user: req.user, req, depth: 0, pagination: false } as const
  const [stores, stock] = await Promise.all([
    payload.find({
      ...as,
      collection: 'stores',
      where: { active: { equals: true } },
      select: { name: true, area: true, lat: true, lng: true },
    }),
    lines.length === 0
      ? { docs: [] }
      : payload.find({
          ...as,
          collection: 'stock-levels',
          where: { product: { in: [...new Set(lines.map((line) => line.productId))] } },
          select: { store: true, product: true, variantSku: true, quantity: true },
        }),
  ])
  const held = new Map<string, number>()
  for (const row of stock.docs as unknown as Record<string, unknown>[]) {
    const key = `${idOf(row.store)}|${idOf(row.product)}|${row.variantSku ?? ''}`
    held.set(key, Number(row.quantity) || 0)
  }
  const options: ReassignOption[] = []
  for (const doc of stores.docs as unknown as Record<string, unknown>[]) {
    const id = idOf(doc)
    const lat = Number(doc.lat)
    const lng = Number(doc.lng)
    if (id === null || id === current || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const holdsAll = lines.every(
      (line) => (held.get(`${id}|${line.productId}|${line.variantSku ?? ''}`) ?? 0) >= line.qty,
    )
    options.push({
      id,
      name: typeof doc.name === 'string' ? doc.name : '—',
      area: typeof doc.area === 'string' ? doc.area : null,
      distanceKm: Math.round(haversineKm({ lat, lng }, pin) * 10) / 10,
      holdsAll,
    })
  }
  return options.sort(
    (a, b) => Number(b.holdsAll) - Number(a.holdsAll) || a.distanceKm - b.distanceKm,
  )
}

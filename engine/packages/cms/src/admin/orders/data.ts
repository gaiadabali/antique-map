/**
 * What the store panel and the owner/editor view read (TASKS.md 7.2): the Local API only, with
 * `overrideAccess: false` and the signed-in user, so a store user's query is scoped to their store
 * by the collection's own access rule (`collections/orders/access.ts` `ownStoreOrders`) — this file
 * trusts that scoping rather than repeating it in a `where`.
 */
import type { Payload, PayloadRequest, Where } from 'payload'

import type { Order, Store } from '../../../payload-types'
import type { OrderStatus } from '../../collections/orders/statuses'
import { driverImageUrl } from '../../shop/fulfilment'

export type OrderRow = Pick<
  Order,
  | 'id'
  | 'number'
  | 'status'
  | 'contact'
  | 'delivery'
  | 'lines'
  | 'giftNote'
  | 'store'
  | 'storeSnapshot'
  | 'totals'
  | 'needsAttention'
  | 'driverImage'
  | 'updatedAt'
  | 'createdAt'
>

const ORDER_ROW_SELECT = {
  number: true,
  status: true,
  contact: true,
  delivery: true,
  lines: true,
  giftNote: true,
  store: true,
  storeSnapshot: true,
  totals: true,
  needsAttention: true,
  driverImage: true,
  updatedAt: true,
  createdAt: true,
} as const

/** Not yet delivered, cancelled or expired — the statuses store staff still act on. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
]

export async function loadStoreQueue(
  payload: Payload,
  req: PayloadRequest,
): Promise<readonly OrderRow[]> {
  const result = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 200,
    overrideAccess: false,
    user: req.user,
    req,
    select: ORDER_ROW_SELECT,
    sort: '-updatedAt',
    where: { status: { in: [...ACTIVE_STATUSES, 'delivered'] } },
  })
  return result.docs as unknown as OrderRow[]
}

export async function loadOwnerOrders(
  payload: Payload,
  req: PayloadRequest,
  filter: { readonly status?: OrderStatus | ''; readonly store?: number | '' },
): Promise<readonly OrderRow[]> {
  const and: Where[] = []
  if (filter.status) and.push({ status: { equals: filter.status } })
  if (filter.store) and.push({ store: { equals: filter.store } })
  const result = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    user: req.user,
    req,
    select: ORDER_ROW_SELECT,
    sort: '-updatedAt',
    ...(and.length ? { where: { and } } : {}),
  })
  return result.docs as unknown as OrderRow[]
}

export async function loadOrder(
  payload: Payload,
  req: PayloadRequest,
  id: number,
): Promise<OrderRow | null> {
  try {
    const doc = await payload.findByID({
      collection: 'orders',
      id,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
      select: ORDER_ROW_SELECT,
    })
    return doc as unknown as OrderRow
  } catch {
    return null
  }
}

export type StoreOption = Pick<Store, 'id' | 'code' | 'name' | 'area' | 'lat' | 'lng'>

export async function loadActiveStores(
  payload: Payload,
  req: PayloadRequest,
): Promise<readonly StoreOption[]> {
  const result = await payload.find({
    collection: 'stores',
    depth: 0,
    limit: 200,
    overrideAccess: false,
    user: req.user,
    req,
    select: { code: true, name: true, area: true, lat: true, lng: true, active: true },
    where: { active: { equals: true } },
    sort: 'name',
  })
  return result.docs as unknown as StoreOption[]
}

/**
 * A short-lived signed URL for the order's driver image, or `null` while there is none — and
 * `null`, never a thrown error, when the signing itself fails (a storage hiccup must cost the
 * preview, not the whole page: `store-panel.jsx` shows the "attached" line without it).
 */
export async function loadDriverImagePreview(
  payload: Payload,
  order: OrderRow,
): Promise<string | null> {
  if (!order.driverImage?.key) return null
  try {
    return await driverImageUrl(payload, order.id, 120)
  } catch {
    return null
  }
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function whatsappLink(whatsapp: string): string {
  const digits = whatsapp.replace(/[^\d+]/g, '').replace(/^\+/, '')
  return `https://wa.me/${digits}`
}

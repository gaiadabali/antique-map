/**
 * What the store panel and the owner/editor view read (TASKS.md 7.2): the Local API only, with
 * `overrideAccess: false` and the signed-in user, so a store user's query is scoped to their store
 * by the collection's own access rule (`collections/orders/access.ts` `ownStoreOrders`) — this file
 * trusts that scoping rather than repeating it in a `where`.
 */
import type { Payload, PayloadRequest, Where } from 'payload'

import { createHref, SITES, siteOrigin } from '@engine/config/sites'

import type { OrderStatus } from '../../collections/orders/statuses'
import { driverImageUrl } from '../../shop/fulfilment'
import { openToken, orderLinkKeyFromEnv } from '../../shop/orders/link-key'

/*
 * The rows are described here, structurally, and NOT imported from the generated
 * `payload-types.ts`: that file carries `declare module 'payload'`, and importing it pulls the
 * generated types into this package's whole typecheck (27 unrelated errors the day it did).
 */

/** An order as the panel reads it: the fields `ORDER_ROW_SELECT` names, shaped as Payload returns them. */
export type OrderRow = {
  readonly id: number
  readonly number: number
  readonly status: OrderStatus
  readonly contact: Readonly<Record<string, unknown>>
  readonly delivery: Readonly<Record<string, unknown>>
  readonly lines: readonly Readonly<Record<string, unknown>>[]
  readonly giftNote?: string | null
  readonly store: number | Readonly<Record<string, unknown>>
  readonly storeSnapshot?: Readonly<Record<string, unknown>> | null
  readonly totals: Readonly<Record<string, unknown>>
  readonly needsAttention?: boolean | null
  readonly driverImage?: { readonly key?: string | null } | null
  /** The quote deadline while `awaiting_quote` (TASKS.md 6.6); the payment deadline after. */
  readonly expiresAt?: string | null
  readonly updatedAt: string
  readonly createdAt: string
}

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
  expiresAt: true,
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

/** A store in the reassign picker. */
export type StoreOption = {
  readonly id: number
  readonly code: string
  readonly name: string
  readonly area?: string | null
  readonly lat?: number | null
  readonly lng?: number | null
}

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

export function whatsappLink(whatsapp: string, text?: string): string {
  const digits = whatsapp.replace(/[^\d+]/g, '').replace(/^\+/, '')
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${query}`
}

/**
 * The buyer's own order-page link, for the admin's WhatsApp button (TASKS.md 6.6.c) — decrypted
 * from the order's `trackingTokenEnc` (`../../shop/orders/link-key`'s `openToken`), never read from
 * the hash. `trackingTokenEnc` is never exposed through access, so: first prove this staff user may
 * see the order (`overrideAccess: false`), then read the sealed link server-side. Never cached,
 * never rendered as text: the caller puts it straight into a `wa.me` `href`.
 */
export async function loadOrderPayLink(
  payload: Payload,
  req: PayloadRequest,
  order: Pick<OrderRow, 'id' | 'contact'>,
): Promise<string | null> {
  try {
    const visible = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
      select: { status: true },
      disableErrors: true,
    })
    if (!visible) return null
    const sealed = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 0,
      overrideAccess: true,
      req,
      select: { trackingTokenEnc: true },
    })
    const enc = (sealed as Record<string, unknown> | null)?.trackingTokenEnc
    if (typeof enc !== 'string' || enc === '') return null
    const token = openToken(enc, orderLinkKeyFromEnv())
    if (!token) return null
    const locale = order.contact?.locale === 'id' ? 'id' : 'en'
    return `${siteOrigin('shop') ?? ''}${createHref(SITES.shop)('order', { token }, locale)}`
  } catch {
    return null
  }
}

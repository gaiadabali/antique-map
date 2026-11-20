/**
 * The stores' alerts (TASKS.md 6.6, 7.1.c, 7.3.b), split out of `./index` (300-line rule): every
 * user of a store, on a newly paid order at that store (`notifyStore`, from `notifyOrderEvent`) and
 * on an order moved to it (`notifyStoreReassigned`, from `reassignOrder`). Best-effort per
 * recipient; one bounce never stops the others, and nothing here ever throws.
 *
 * The admin link opens the order page of the orders inbox (TASKS.md 27.3), not the raw collection.
 */
import type { Payload, PayloadRequest } from 'payload'

import { adminOrigin } from '@engine/config/sites'

import { storeNewOrderEmail, storeReassignedEmail } from './store-templates'
import { mailTransport } from './transport'
import { loadStoredWording, wordingFor } from './wording'

export type OrderForStore = {
  readonly id: number
  readonly number: number
  readonly store?: { id: number; name?: string | null } | number | null
  readonly lines?: readonly { name?: string | null; qty?: number | null }[] | null
  readonly totals?: { total?: number | null } | null
}

type Kind = 'storeNewOrder' | 'storeReassigned'

/** Every user of `order`'s store gets `kind`'s email, in both languages. */
export async function alertStore(
  payload: Payload,
  order: OrderForStore,
  kind: Kind,
  req?: PayloadRequest,
): Promise<void> {
  const storeId = typeof order.store === 'object' ? order.store?.id : order.store
  if (storeId === null || storeId === undefined) return
  const storeName =
    (typeof order.store === 'object' ? order.store?.name : null) ?? `store #${storeId}`
  const itemSummary = (order.lines ?? [])
    .map((line) => `${line.qty ?? 1}× ${line.name ?? 'item'}`)
    .join(', ')
  const adminUrl = `${adminOrigin() ?? ''}/admin/orders/${order.id}`

  let users: readonly { email?: string | null }[]
  try {
    const result = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { and: [{ role: { equals: 'store' } }, { store: { equals: storeId } }] },
      select: { email: true },
      limit: 100,
      ...(req ? { req } : {}),
    })
    users = result.docs as readonly { email?: string | null }[]
  } catch {
    return
  }
  if (users.length === 0) return

  const vars = { number: order.number, store: storeName }
  const [en, id] = await Promise.all([
    loadStoredWording(payload, 'en', req),
    loadStoredWording(payload, 'id', req),
  ])
  const wording = { en: wordingFor(en, kind, 'en', vars), id: wordingFor(id, kind, 'id', vars) }
  const build = kind === 'storeNewOrder' ? storeNewOrderEmail : storeReassignedEmail

  for (const user of users) {
    if (!user.email) continue
    try {
      await mailTransport().send(
        build({
          to: user.email,
          orderNumber: order.number,
          storeName,
          itemSummary,
          totalIdr: order.totals?.total ?? 0,
          adminUrl,
          wording,
        }),
      )
    } catch {
      // Best-effort, per recipient: one store user's bounce never stops the others.
    }
  }
}

export type NotifyStoreReassignedInput = {
  readonly orderId: number
  readonly req?: PayloadRequest
}

/**
 * The new store's alert on a reassignment (TASKS.md 6.6, 7.1.c): reassigning changes no status
 * (`from === to` always), so it is not `notifyOrderEvent`'s to send — called by `reassignOrder`
 * directly, after its own transaction commits. Never claimed: a store legitimately hears again
 * each time an order moves to it.
 */
export async function notifyStoreReassigned(
  payload: Payload,
  input: NotifyStoreReassignedInput,
): Promise<void> {
  let order: OrderForStore
  try {
    order = (await payload.findByID({
      collection: 'orders',
      id: input.orderId,
      overrideAccess: true,
      depth: 1,
      ...(input.req ? { req: input.req } : {}),
      select: {
        number: true,
        store: { name: true },
        lines: { name: true, qty: true },
        totals: { total: true },
      },
    })) as OrderForStore
  } catch {
    return
  }
  if (!order) return
  await alertStore(payload, order, 'storeReassigned', input.req)
}

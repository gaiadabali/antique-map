/**
 * Reassigning an order to another store (COMMERCE.md §4 "Staff reassignment"; TASKS.md 7.1.c).
 * Owner or editor only; a `paid` or `processing` order only. ONE transaction, READ COMMITTED:
 *
 * 1. **Lock the order.** A second reassign of the same order waits here, then reads the store the
 *    first one set — and is refused `same_store` if it asked for the same one: the stock moves once.
 * 2. **The target store** must be active with a pin (the new distance is measured from it).
 * 3. **Per product and variant, in the lock order** (`./order-sql`), the lower store id first:
 *    the atomic decrement at the new store (`UPDATE … WHERE quantity >= n`, the order code's own
 *    `takeStock`) and the increment back at the old one. A decrement that updates no row means
 *    the new store cannot fill that line: every line is still checked, so the refusal names them
 *    all, and then the transaction **rolls back** — the increments already made with it — so both
 *    stores' stock is exactly as it was.
 * 4. **The order** points at the new store, its snapshot and distance; the delivery fee the buyer
 *    paid never changes. `needsAttention` is left as it is: the payments core raises it too (a
 *    late or doubled payment), so the owner clears it in the admin once every reason is handled.
 * 5. **History**: one row naming both stores, by whom.
 */
import type { Payload } from 'payload'

import { takeStock } from '../orders/order-sql'
import { roundedDistanceKm } from '../orders/geo'
import { notifyStoreReassigned } from '../notify'
import { inTransaction, sql, type Tx } from '../payments/transaction'
import { isManager, staffOf } from './actor'
import {
  activeStore,
  addUserHistory,
  lockOrder,
  orderUnits,
  putBack,
  storeName,
  type StoreRow,
  type Unit,
} from './order-sql'
import type { FulfilmentLineRef, ReassignInput, ReassignResult } from './types'

const REASSIGNABLE = ['paid', 'processing'] as const

/** Thrown inside the transaction to roll it back; caught outside it and answered as a refusal. */
class ShortStock extends Error {
  constructor(readonly lines: readonly FulfilmentLineRef[]) {
    super('fulfilment: the new store cannot fill the order')
  }
}

async function moveUnits(tx: Tx, from: number, to: StoreRow, units: readonly Unit[], at: Date) {
  const short: FulfilmentLineRef[] = []
  for (const unit of units) {
    const take = async () => {
      const line = { productId: unit.productId, variantSku: unit.variantSku, qty: unit.qty }
      if (!(await takeStock(tx, to.id, line, at))) {
        short.push({ productId: unit.productId, variantSku: unit.variantSku })
      }
    }
    if (to.id < from) {
      await take()
      await putBack(tx, from, unit, at)
    } else {
      await putBack(tx, from, unit, at)
      await take()
    }
  }
  if (short.length > 0) throw new ShortStock(short)
}

async function pointAt(tx: Tx, orderId: number, store: StoreRow, distanceKm: number, at: Date) {
  await tx.rows(sql`
    UPDATE orders
       SET store_id = ${store.id}, store_snapshot_code = ${store.code},
           store_snapshot_name = ${store.name}, store_snapshot_area = ${store.area},
           distance_km = ${distanceKm}, updated_at = ${at}
     WHERE id = ${orderId}`)
}

/**
 * Reassigns a `paid` or `processing` order to another store (COMMERCE.md §4), owner or editor
 * only: in one transaction the units go back to the first store and are taken at the second by
 * the atomic decrement; refused, with both stocks unchanged, when the second cannot fill every line.
 */
export async function reassignOrder(
  payload: Payload,
  input: ReassignInput,
): Promise<ReassignResult> {
  const staff = staffOf(input.actor)
  if (!isManager(staff)) {
    return {
      ok: false,
      refusal: 'not_allowed',
      message: 'Only the owner or an editor reassigns an order.',
    }
  }
  const at = input.now ?? new Date()
  try {
    const result = await inTransaction(payload, async (tx): Promise<ReassignResult> => {
      const order = await lockOrder(tx, input.orderId)
      if (order === null) {
        return { ok: false, refusal: 'not_found', message: 'There is no such order.' }
      }
      if (!(REASSIGNABLE as readonly string[]).includes(order.status)) {
        return {
          ok: false,
          refusal: 'wrong_status',
          message: 'Only a paid order not yet waiting for a driver can be reassigned.',
        }
      }
      if (order.store === input.toStoreId) {
        return { ok: false, refusal: 'same_store', message: 'The order is already at that store.' }
      }
      const target = await activeStore(tx, input.toStoreId)
      if (target === null) {
        return {
          ok: false,
          refusal: 'store_unavailable',
          message: 'That store is not active, or has no map pin.',
        }
      }
      await moveUnits(tx, order.store, target, await orderUnits(tx, order.id), at)
      const distanceKm = roundedDistanceKm(target, order.pin)
      await pointAt(tx, order.id, target, distanceKm, at)
      await addUserHistory(tx, order.id, {
        from: order.status,
        to: order.status,
        at,
        by: staff.id,
        note: `Reassigned from ${await storeName(tx, order.store)} to ${target.name} (${target.code}).`,
      })
      return {
        ok: true,
        orderId: order.id,
        fromStoreId: order.store,
        toStoreId: target.id,
        distanceKm,
      }
    })
    // After commit: the new store's alert (TASKS.md 6.6, 7.1.c) — reassigning changes no status,
    // so it is never `notifyOrderEvent`'s to send.
    if (result.ok) {
      await notifyStoreReassigned(payload, { orderId: result.orderId }).catch(() => {})
    }
    return result
  } catch (error) {
    if (!(error instanceof ShortStock)) throw error
    return {
      ok: false,
      refusal: 'not_enough_stock',
      message: 'That store cannot fill every line of the order; nothing was changed.',
      lines: error.lines,
    }
  }
}

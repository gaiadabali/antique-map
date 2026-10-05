/**
 * Moving an order between statuses (COMMERCE.md §4, §7; TASKS.md 7.1.a). ONE transaction, READ
 * COMMITTED (`../payments/transaction`):
 *
 * 1. **Lock the order** (`FOR UPDATE`). A concurrent move waits here, then reads the row as the
 *    winner left it — so two clicks on the same button make one move, and the second is judged
 *    against the new status (`no_change`, or the machine's refusal).
 * 2. **Judge** the move (`./transitions`, pure): who, whose store, which step, the driver image.
 * 3. **Compare-and-set** the status on the one it was locked in.
 * 4. **Stock**: a cancel from a holding status (`pending_payment` … `waiting_driver`) puts every
 *    unit back on the order's store's shelf, in the lock order; a cancel before payment also gives
 *    back the discount code's use, as the expiry does. A cancel once `on_the_way` returns nothing:
 *    the units have left the shelf (COMMERCE.md §4 "Release").
 * 5. **History**: one row — from, to, when, by whom, and the reason given.
 *
 * Because the status changes in the same transaction under the same lock, the units return once:
 * a second cancel finds the order `cancelled` and is refused before any stock moves. Expiry is the
 * payments core's (`../payments/release`), under the same rule.
 */
import type { Payload } from 'payload'

import { notifyOrderEvent } from '../notify'
import { inTransaction } from '../payments/transaction'
import { staffOf } from './actor'
import {
  addUserHistory,
  giveBackDiscount,
  lockOrder,
  orderUnits,
  putBack,
  setStatus,
} from './order-sql'
import { judgeMove } from './transitions'
import type { MoveInput, MoveResult } from './types'

const reasonOf = (reason: string | undefined): string | null => {
  const trimmed = reason?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/**
 * Moves an order to `to` (COMMERCE.md §7): store staff one step forward on their own store's
 * order, the owner and editors any legal move. One transaction with the order row locked; a
 * history row (who, when, from, to, reason) for every change; a cancel from a holding status
 * returns the order's stock to its store once.
 */
export async function moveOrder(payload: Payload, input: MoveInput): Promise<MoveResult> {
  const staff = staffOf(input.actor)
  if (staff === null) {
    return { ok: false, refusal: 'not_staff', message: 'Only staff move an order.' }
  }
  const at = input.now ?? new Date()
  const note = reasonOf(input.reason)

  const result = await inTransaction(payload, async (tx): Promise<MoveResult> => {
    const order = await lockOrder(tx, input.orderId)
    if (order === null) {
      return { ok: false, refusal: 'not_found', message: 'There is no such order.' }
    }
    const judged = judgeMove({
      role: staff.role,
      actorStore: staff.store,
      orderStore: order.store,
      from: order.status,
      to: input.to,
      hasDriverImage: order.driverImageKey !== null,
    })
    if (!judged.ok) return judged

    await setStatus(tx, order.id, order.status, input.to, at)
    if (judged.returnsStock) {
      for (const unit of await orderUnits(tx, order.id)) await putBack(tx, order.store, unit, at)
      if (order.status === 'pending_payment' && order.discountCode !== null) {
        await giveBackDiscount(tx, order.discountCode, at)
      }
    }
    await addUserHistory(tx, order.id, {
      from: order.status,
      to: input.to,
      at,
      by: staff.id,
      note: judged.returnsStock ? (note ?? 'Cancelled; stock returned.') : note,
    })
    return {
      ok: true,
      orderId: order.id,
      from: order.status,
      to: input.to,
      stockReturned: judged.returnsStock,
    }
  })
  // After commit (TASKS.md 6.6, orchestrator decision B): the buyer's status email.
  if (result.ok) {
    await notifyOrderEvent(payload, {
      orderId: result.orderId,
      from: result.from,
      to: result.to,
    }).catch(() => {})
  }
  return result
}

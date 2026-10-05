/**
 * A store handing an order back (COMMERCE.md §7; TASKS.md 7.1.c): store staff who cannot send
 * their store's order — an item damaged on the shelf, the store closing early — raise
 * `needsAttention` with a reason, so the owner or an editor reassigns or cancels it. The status
 * and the stock do not change; the order stays where it is until they act. One transaction with
 * the order locked; the reason is kept on the flag (beside any reason already raised) and on a
 * history row, with who and when.
 */
import type { Payload } from 'payload'

import { flagOrder } from '../payments/order-sql'
import { inTransaction } from '../payments/transaction'
import { reaches, staffOf } from './actor'
import { addUserHistory, lockOrder } from './order-sql'
import type { HandBackInput, HandBackResult } from './types'

const HANDABLE = ['paid', 'processing', 'waiting_driver'] as const
export const HAND_BACK_REASON_MAX = 500

/** A store user hands their store's order back with a reason; it is flagged for the owner. */
export async function handBackOrder(
  payload: Payload,
  input: HandBackInput,
): Promise<HandBackResult> {
  const staff = staffOf(input.actor)
  if (staff?.role !== 'store') {
    return {
      ok: false,
      refusal: 'not_allowed',
      message: 'Only store staff hand an order back; reassign or cancel it instead.',
    }
  }
  const reason = input.reason.trim().slice(0, HAND_BACK_REASON_MAX)
  if (reason === '') {
    return {
      ok: false,
      refusal: 'reason_required',
      message: 'Say why the store cannot send this order.',
    }
  }
  const at = input.now ?? new Date()

  return inTransaction(payload, async (tx): Promise<HandBackResult> => {
    const order = await lockOrder(tx, input.orderId)
    if (order === null) {
      return { ok: false, refusal: 'not_found', message: 'There is no such order.' }
    }
    if (!reaches(staff, order.store)) {
      return {
        ok: false,
        refusal: 'not_your_store',
        message: 'This order belongs to another store.',
      }
    }
    if (!(HANDABLE as readonly string[]).includes(order.status)) {
      return {
        ok: false,
        refusal: 'wrong_status',
        message: 'Only an order a driver has not yet collected can be handed back.',
      }
    }
    await flagOrder(tx, order.id, `Handed back by the store: ${reason}`, at)
    await addUserHistory(tx, order.id, {
      from: order.status,
      to: order.status,
      at,
      by: staff.id,
      note: `Handed back: ${reason}`,
    })
    return { ok: true, orderId: order.id }
  })
}

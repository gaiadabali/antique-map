/**
 * Clearing an order's `needsAttention` flag (TASKS.md 10.7.b; runbook §7 step 5): once staff have
 * dealt with every reason on it — a late payment sent or its money returned, a hand-back
 * reassigned — the owner or an editor clears it with a note saying what was done. Store staff do
 * not: the flag is how a store's problem reaches the owner. One transaction with the order locked;
 * the flag and its reason go, and a history row keeps both the note and the reason it cleared, by
 * whom and when. A second click finds the order unflagged and is refused, writing nothing.
 */
import type { Payload } from 'payload'

import { inTransaction, sql } from '../payments/transaction'
import { isManager, staffOf } from './actor'
import { addUserHistory, lockOrder } from './order-sql'
import {
  STAFF_NOTE_MAX,
  type ClearFlagInput,
  type ClearFlagRefusal,
  type ClearFlagResult,
} from './types'

const MESSAGES: Record<ClearFlagRefusal, string> = {
  not_allowed: 'Only the owner or an editor clears a flag.',
  not_found: 'There is no such order.',
  note_required: 'Say what was done about it.',
  not_flagged: 'The order is not flagged.',
}

const refuse = (refusal: ClearFlagRefusal): ClearFlagResult => ({
  ok: false,
  refusal,
  message: MESSAGES[refusal],
})

export async function clearOrderFlag(
  payload: Payload,
  input: ClearFlagInput,
): Promise<ClearFlagResult> {
  const staff = staffOf(input.actor)
  if (!isManager(staff)) return refuse('not_allowed')
  const note = input.note.trim().slice(0, STAFF_NOTE_MAX)
  if (note === '') return refuse('note_required')
  const at = input.now ?? new Date()

  return inTransaction(payload, async (tx): Promise<ClearFlagResult> => {
    const order = await lockOrder(tx, input.orderId)
    if (order === null) return refuse('not_found')
    // Read under the lock just taken: the reason being cleared, for the history row.
    const [flagged] = await tx.rows(sql`
      SELECT needs_attention_reason AS reason FROM orders
       WHERE id = ${order.id} AND needs_attention_flag IS TRUE`)
    if (!flagged) return refuse('not_flagged')
    await tx.rows(sql`
      UPDATE orders SET needs_attention_flag = false, needs_attention_reason = NULL, updated_at = ${at}
       WHERE id = ${order.id}`)
    const reason = typeof flagged.reason === 'string' ? flagged.reason : ''
    await addUserHistory(tx, order.id, {
      from: order.status,
      to: order.status,
      at,
      by: staff.id,
      note: `Flag cleared: ${note}${reason ? ` (was: ${reason})` : ''}`,
    })
    return { ok: true, orderId: order.id }
  })
}

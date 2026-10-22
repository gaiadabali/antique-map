/**
 * **Replace damaged item** (COMMERCE.md §12; CONTENT-OPERATIONS.md §5.5; TASKS.md 10.7.a; finding
 * R-2 of `docs/gates/rehearsal.md`): the owner or an editor ticks the damaged lines of a
 * `delivered` order, with a note, and a new order goes out at Rp 0. Server-side authority only:
 * store staff and anyone not signed in are refused here, whatever a screen showed them.
 *
 * ONE transaction, READ COMMITTED (`../payments/transaction`):
 * 1. **Lock the original** (`FOR UPDATE`). Two clicks on Confirm serialise here, and the second
 *    counts the first's replacement (step 3).
 * 2. **Judge**: a `delivered` order; a note; every ticked line one of the original's, with a
 *    whole quantity of at least one.
 * 3. **Never more than was sold**: per product and variant, the units asked for plus those already
 *    replaced by the original's standing replacements stay within what the original sold.
 * 4. **Take the units** at the original's store by the order code's own single-statement decrement
 *    (`takeLines`: `UPDATE … WHERE quantity >= n`, in the lock order, under a short lock). A line
 *    the store cannot fill rolls the whole transaction back: nothing is written, and the screen
 *    says which store is short. A row locked past the short wait is `busy`, also with nothing written.
 * 5. **Write the replacement** `processing`, `channel: replacement`, `replacementOf` the original:
 *    its contact, delivery and store; the lines at their original unit price, for the record;
 *    every total Rp 0 (no fee, no discount, no payment); a new tracking token (only its hash and
 *    its sealed copy are stored, as `createOrder` stores them); a history row naming the member of
 *    staff and the note.
 * 6. **A history row on the original** naming the replacement.
 *
 * After commit, the buyer's tracking email ("being packed"), as every status email is sent.
 * Prices come from the original's own lines, never from the request: the request names lines and
 * quantities only.
 */
import type { Payload } from 'payload'

import { notifyOrderEvent } from '../notify'
import { orderLinkKeyFromEnv, sealToken } from '../orders/link-key'
import { inLockOrder, newTrackingToken, nextOrderNumber, takeLines } from '../orders/order-sql'
import { inTransaction, isLockContention, type Tx } from '../payments/transaction'
import { isManager, staffOf, type Staff } from './actor'
import { addUserHistory, lockOrder } from './order-sql'
import {
  alreadyReplaced,
  insertReplacement,
  originalRow,
  soldLines,
  unitKey,
  type SoldLine,
} from './replace-sql'
import { STAFF_NOTE_MAX, type ReplaceInput, type ReplaceRefusal, type ReplaceResult } from './types'

const MESSAGES: Record<ReplaceRefusal, string> = {
  not_allowed: 'Only the owner or an editor replaces a damaged item.',
  not_found: 'There is no such order.',
  wrong_status: 'Only a delivered order can have a damaged item replaced.',
  note_required: 'Say what was damaged.',
  replace_no_lines: 'Tick at least one line of the order, with a whole quantity.',
  replace_too_many: 'That is more than the order sold of a line, counting earlier replacements.',
  replace_short: 'The order’s store cannot fill every line; nothing was written.',
  busy: 'Another action holds this order or its stock; nothing was written. Try again.',
}

const refuse = (refusal: ReplaceRefusal, rest: Partial<ReplaceResult> = {}): ReplaceResult =>
  ({ ok: false, refusal, message: MESSAGES[refusal], ...rest }) as ReplaceResult

/** Thrown inside the transaction so everything it did rolls back; answered outside it. */
class Rollback extends Error {
  constructor(readonly result: ReplaceResult) {
    super(`replacement refused: ${result.ok ? 'ok' : result.refusal}`)
  }
}

type Picked = SoldLine & { readonly replaceQty: number }

/** The ticked lines, judged against the original's own: null when any is not one of them. */
function pick(sold: readonly SoldLine[], asked: ReplaceInput['lines']): Picked[] | null {
  if (asked.length === 0) return null
  const byId = new Map(sold.map((line) => [line.id, line]))
  const picked: Picked[] = []
  const seen = new Set<string>()
  for (const { lineId, qty } of asked) {
    const line = byId.get(lineId)
    if (!line || seen.has(lineId) || !Number.isSafeInteger(qty) || qty < 1) return null
    seen.add(lineId)
    picked.push({ ...line, replaceQty: qty })
  }
  return picked
}

/** Per product and variant: what is asked for now, judged against what is left to replace. */
async function withinSold(tx: Tx, orderId: number, sold: readonly SoldLine[], picked: Picked[]) {
  const total = (lines: readonly SoldLine[], qty: (line: SoldLine) => number) => {
    const sums = new Map<string, number>()
    for (const line of lines) {
      const k = unitKey(line.productId, line.variantSku)
      sums.set(k, (sums.get(k) ?? 0) + qty(line))
    }
    return sums
  }
  const soldUnits = total(sold, (line) => line.qty)
  const askedUnits = total(picked, (line) => (line as Picked).replaceQty)
  const replaced = await alreadyReplaced(tx, orderId)
  for (const [k, asked] of askedUnits) {
    if (asked + (replaced.get(k) ?? 0) > (soldUnits.get(k) ?? 0)) return false
  }
  return true
}

async function replaceIn(tx: Tx, input: ReplaceInput, staff: Staff, note: string, at: Date) {
  const order = await lockOrder(tx, input.orderId)
  if (order === null) return refuse('not_found')
  if (order.status !== 'delivered') return refuse('wrong_status')
  const sold = await soldLines(tx, order.id)
  const picked = pick(sold, input.lines)
  if (picked === null) return refuse('replace_no_lines')
  if (!(await withinSold(tx, order.id, sold, picked))) return refuse('replace_too_many')

  // Before any write: a refusal here commits nothing but the reads.
  const units = await inLockOrder(
    tx,
    picked.map((line) => ({
      productId: line.productId,
      variantSku: line.variantSku,
      qty: line.replaceQty,
    })),
  )
  const taken = await takeLines(tx, order.store, units, at)
  if (!taken.taken) {
    const { productId, variantSku } = taken.line
    // Earlier lines' decrements may stand under a released savepoint: roll all of it back.
    throw new Rollback(
      taken.busy ? refuse('busy') : refuse('replace_short', { lines: [{ productId, variantSku }] }),
    )
  }

  const original = await originalRow(tx, order.id)
  const number = await nextOrderNumber(tx)
  const { token, hash } = newTrackingToken()
  const orderId = await insertReplacement(tx, {
    number,
    original: { id: order.id, row: original },
    lines: picked,
    trackingTokenHash: hash,
    trackingTokenEnc: sealToken(token, orderLinkKeyFromEnv()),
    by: staff.id,
    note,
    at,
  })
  await addUserHistory(tx, order.id, {
    from: order.status,
    to: order.status,
    at,
    by: staff.id,
    note: `Damaged item replaced by order #${number} (Rp 0): ${note}`,
  })
  return { ok: true, orderId, number, originalId: order.id } as const
}

/**
 * Creates a Rp 0 replacement of a delivered order's damaged lines at its store (COMMERCE.md §12),
 * owner or editor only — or says why not, with nothing written. See the file header.
 */
export async function replaceDamagedItem(
  payload: Payload,
  input: ReplaceInput,
): Promise<ReplaceResult> {
  const staff = staffOf(input.actor)
  if (!isManager(staff)) return refuse('not_allowed')
  const note = input.note.trim().slice(0, STAFF_NOTE_MAX)
  if (note === '') return refuse('note_required')
  const at = input.now ?? new Date()

  let result: ReplaceResult
  try {
    result = await inTransaction(payload, (tx) => replaceIn(tx, input, staff, note, at))
  } catch (error) {
    if (error instanceof Rollback) return error.result
    if (isLockContention(error)) return refuse('busy')
    throw error
  }
  // After commit (TASKS.md 6.6, orchestrator decision B): the buyer's tracking email.
  if (result.ok) {
    await notifyOrderEvent(payload, {
      orderId: result.orderId,
      from: null,
      to: 'processing',
    }).catch(() => {})
  }
  return result
}

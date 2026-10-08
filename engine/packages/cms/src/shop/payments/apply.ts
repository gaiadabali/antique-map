/**
 * Applies one confirmed Midtrans status to its order — the webhook's, the reconciler's and the
 * sweep's one function (COMMERCE.md §6 "apply"; SECURITY.md W3–W4; TASKS.md 6.4.b).
 *
 * ONE transaction, READ COMMITTED (`./transaction`) — the ledger row and the order's move commit
 * together or not at all, so a process killed mid-apply leaves nothing recorded and the retry
 * applies it (a separately committed claim could strand a payment on a crash):
 * 1. **Lock the order** the attempt's `order_id` names (`SELECT … FOR UPDATE`); none → the event
 *    is recorded as `unknown-order`. Steps 1–3 run under a short lock (`ORDER_LOCK_TIMEOUT`,
 *    `underShortLock`); see **Contention** below.
 * 2. **Decide** (`./decide`, pure) on the order as locked — after any concurrent delivery of the
 *    same notification has committed, since the lock waits for it and READ COMMITTED then reads
 *    the row as it left it.
 * 3. **Insert the ledger row** with its outcome, `ON CONFLICT (dedupe_key) DO NOTHING`. No row
 *    came back → a duplicate → nothing else happens; the caller answers 200.
 * 4. **Carry the decision out**: the attempt's state; `paid` (compare-and-set) with its history;
 *    `expired` with the stock released once (`./release`); the staff flag; a history note.
 *
 * **Contention** (TASKS.md 10.5.a). A delivery that cannot take the order's lock (or the dedupe
 * key's index entry) within `ORDER_LOCK_TIMEOUT` writes nothing and looks the key up in the
 * ledger: recorded → `duplicate` (the winner applied it; the caller answers 200); not yet → `busy`
 * (the caller answers 503 with `Retry-After`, and Midtrans retries). A lock lost later in the
 * transaction (the expiry's stock rows, under the transaction's own `LOCK_TIMEOUT`) rolls
 * everything back and is answered the same way. Never a 500 for contention.
 *
 * Any other throw rolls all of it back, the ledger row included, and the caller answers 500 so
 * Midtrans retries. Notification emails (COMMERCE.md §11) join this transaction when phase 7 registers
 * their jobs; there are none to queue yet.
 *
 * **Lock order.** ARCHITECTURE.md §7 lists the dedupe row before the order; here the order is
 * locked first, because the ledger is append-only (no row may be updated once written, by a
 * trigger) and the row must carry the outcome, which needs the locked order. It cannot deadlock:
 * nothing else locks a `payment_events` row, and every writer of an order — this, the sweep, staff
 * moves — takes the order before stock and counters. Duplicates still serialise: on the order's
 * lock, or, for an unknown order, on the dedupe key's unique index.
 */
import type { Payload } from 'payload'

import { notifyOrderEvent } from '../notify'
import { decide, type Outcome } from './decide'
import { dedupeKeyOf, parseAttemptOrderId, type MidtransStatus } from './notification'
import {
  addHistory,
  flagOrder,
  insertEvent,
  lockOrderByNumber,
  markPaid,
  recordedEvent,
  setAttemptState,
} from './order-sql'
import { expireAndRelease } from './release'
import { inTransaction, isLockContention, underShortLock } from './transaction'

/**
 * How long a delivery waits for its order's lock. Applying a payment holds it for milliseconds;
 * a wait this long means a stuck or saturated winner, and Midtrans retrying later beats holding a
 * pool connection (whose own wait is 5 s, `db/adapter`'s `POOL_CONNECT_TIMEOUT_MS`).
 */
export const ORDER_LOCK_TIMEOUT = '2s'

export type PaymentSource = 'webhook' | 'reconcile' | 'simulate'

export type ApplyInput = {
  readonly status: MidtransStatus
  readonly source: PaymentSource
  /** SHA-256 of the notification body or status answer — the ledger never holds the body. */
  readonly payloadHash: string
  readonly now?: Date
}

export type ApplyResult = {
  /**
   * The outcome recorded; `duplicate` when the event was already in the ledger; `busy` when the
   * order's lock was lost and the event is not recorded yet — nothing was written, retry later.
   */
  readonly outcome: Outcome | 'duplicate' | 'busy'
  readonly orderId: number | null
}

export async function applyPaymentStatus(
  payload: Payload,
  input: ApplyInput,
): Promise<ApplyResult> {
  const { status, source, payloadHash } = input
  const now = input.now ?? new Date()
  const attempt = parseAttemptOrderId(status.midtransOrderId)
  const dedupeKey = dedupeKeyOf(status)

  const result = await inTransaction(payload, async (tx): Promise<ApplyResult> => {
    const claimed = await underShortLock(tx, ORDER_LOCK_TIMEOUT, async () => {
      const order = attempt ? await lockOrderByNumber(tx, attempt.orderNumber) : null
      const decision = decide(order, status, now)
      const written = await insertEvent(tx, {
        dedupeKey,
        orderId: order?.id ?? null,
        status,
        source,
        outcome: decision.outcome,
        payloadHash,
        at: now,
      })
      return { order, decision, written }
    })
    if (!claimed.locked) return lostLock(await recordedEvent(tx, dedupeKey))
    const { order, decision, written } = claimed.value
    if (!written) return { outcome: 'duplicate', orderId: order?.id ?? null }
    if (!order) return { outcome: decision.outcome, orderId: null }

    await setAttemptState(tx, order.id, status)
    if (decision.move === 'paid') await markPaid(tx, order, status, now)
    if (decision.move === 'expired') {
      await expireAndRelease(
        tx,
        order.id,
        now,
        'midtrans',
        `Midtrans closed attempt ${status.midtransOrderId} (${status.transactionStatus}) after the payment window.`,
      )
    }
    if (decision.flag) await flagOrder(tx, order.id, decision.flag, now)
    if (decision.note) {
      await addHistory(tx, order.id, {
        from: order.status,
        to: order.status,
        actor: 'midtrans',
        at: now,
        note: decision.note,
      })
    }
    return { outcome: decision.outcome, orderId: order.id }
  }).catch(async (error: unknown): Promise<ApplyResult> => {
    // A lock lost after the claim (under the transaction's own LOCK_TIMEOUT): all rolled back.
    if (!isLockContention(error)) throw error
    return lostLock(await inTransaction(payload, (tx) => recordedEvent(tx, dedupeKey)))
  })
  // After commit (TASKS.md 6.6, orchestrator decision B): the buyer's "paid" or "expired" email.
  if (result.orderId !== null) {
    if (result.outcome === 'paid') {
      await notifyOrderEvent(payload, {
        orderId: result.orderId,
        from: 'pending_payment',
        to: 'paid',
      }).catch(() => {})
    } else if (result.outcome === 'expired') {
      await notifyOrderEvent(payload, {
        orderId: result.orderId,
        from: 'pending_payment',
        to: 'expired',
      }).catch(() => {})
    }
  }
  return result
}

/** A delivery that lost the order's lock: the winner's 200 if it recorded the event, else retry. */
function lostLock(recorded: { orderId: number | null } | null): ApplyResult {
  return recorded
    ? { outcome: 'duplicate', orderId: recorded.orderId }
    : { outcome: 'busy', orderId: null }
}

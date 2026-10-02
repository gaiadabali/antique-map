/**
 * What one confirmed Midtrans status does to an order (COMMERCE.md §6 step 3–4, §7, §13) — pure,
 * so every branch is unit-tested; `./apply` carries the decision out in the transaction.
 *
 * The status machine only moves forward, and Midtrans moves an order only out of
 * `pending_payment`: to `paid` (settlement, or a card capture the fraud check accepted) or to
 * `expired` (the attempt expired or was cancelled **and** the order's window has closed — while
 * time is left the buyer may try another method). Everything else is recorded and changes no status.
 *
 * Money that arrives where it should not is **flagged for staff, never silently applied**:
 * - an amount other than the order's priced total — not marked paid (SECURITY.md W2);
 * - a payment on an `expired` or `cancelled` order — the order stays where it is, flagged: its
 *   units may have been sold again, so the owner decides (re-take the stock, reassign, or return
 *   the money in the Midtrans dashboard). See the report's Found note on COMMERCE.md §13.
 * - a second settled payment on a paid order (another attempt) — flagged for a return;
 * - a card capture under fraud challenge — flagged for the owner's decision in Midtrans.
 */
import type { OrderStatus } from '../../collections/orders/statuses'
import type { MidtransStatus } from './notification'

export const OUTCOMES = [
  'paid',
  'expired',
  'recorded',
  'attempt-closed',
  'already-applied',
  'unknown-order',
  'amount-mismatch',
  'late-payment',
  'double-payment',
  'fraud-challenge',
  'refund-recorded',
  'ignored',
] as const
export type Outcome = (typeof OUTCOMES)[number]

/** The order as the webhook locked it. */
export type LockedOrder = {
  readonly id: number
  readonly number: number
  readonly status: OrderStatus
  /** The priced total, whole rupiah. */
  readonly total: number
  /** The end of the payment window (`expiresAt`, or creation + the default window). */
  readonly expiresAt: Date
  /** The transaction that paid it, once paid. */
  readonly paidTransactionId: string | null
}

export type Decision = {
  readonly outcome: Outcome
  readonly move: 'paid' | 'expired' | null
  /** A reason to raise `needsAttention` with, for staff. */
  readonly flag: string | null
  /** A history note written without a status change. */
  readonly note: string | null
}

const SUCCESS = new Set(['settlement'])
const CLOSED = new Set(['expire', 'cancel'])
const ATTEMPT_ONLY = new Set(['pending', 'deny', 'failure', 'authorize'])
const REFUNDS = new Set(['refund', 'partial_refund', 'chargeback', 'partial_chargeback'])

const rupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`
const decision = (outcome: Outcome, rest: Partial<Omit<Decision, 'outcome'>> = {}): Decision => ({
  outcome,
  move: null,
  flag: null,
  note: null,
  ...rest,
})

/** True for a status that means the money was taken. */
export function isSuccess(status: MidtransStatus): boolean {
  return (
    SUCCESS.has(status.transactionStatus) ||
    (status.transactionStatus === 'capture' && status.fraudStatus === 'accept')
  )
}

export function decide(order: LockedOrder | null, status: MidtransStatus, now: Date): Decision {
  if (!order) return decision('unknown-order')
  const attempt = status.midtransOrderId
  const ts = status.transactionStatus

  if (status.grossAmount !== order.total) {
    const reported =
      status.grossAmount === null ? status.grossAmountText : rupiah(status.grossAmount)
    return decision('amount-mismatch', {
      flag: `Midtrans reported ${reported} (${ts}) for attempt ${attempt}, but the order total is ${rupiah(order.total)}. Not applied: check the Midtrans dashboard.`,
    })
  }

  if (isSuccess(status)) {
    if (order.status === 'pending_payment') return decision('paid', { move: 'paid' })
    if (order.status === 'expired' || order.status === 'cancelled') {
      return decision('late-payment', {
        flag: `Paid (${rupiah(status.grossAmount)}, attempt ${attempt}) after the order was ${order.status}. Its stock may have sold again: re-take the stock and send it, or return the money in the Midtrans dashboard.`,
      })
    }
    if (status.transactionId !== null && status.transactionId === order.paidTransactionId) {
      return decision('already-applied')
    }
    return decision('double-payment', {
      flag: `A second payment settled (attempt ${attempt}, ${rupiah(status.grossAmount)}) on an order already paid. Return it in the Midtrans dashboard.`,
    })
  }

  if (ts === 'capture') {
    if (order.status !== 'pending_payment') return decision('recorded')
    return decision('fraud-challenge', {
      flag: `A card payment (attempt ${attempt}) is held by Midtrans's fraud check (${status.fraudStatus ?? 'no verdict'}). Accept or deny it in the Midtrans dashboard.`,
    })
  }

  if (CLOSED.has(ts)) {
    if (order.status !== 'pending_payment') return decision('attempt-closed')
    // While time is left the buyer may open another attempt (COMMERCE.md §4).
    return now.getTime() >= order.expiresAt.getTime()
      ? decision('expired', { move: 'expired' })
      : decision('attempt-closed')
  }

  if (ATTEMPT_ONLY.has(ts)) return decision('recorded')

  if (REFUNDS.has(ts)) {
    return decision('refund-recorded', {
      note: `Midtrans reports ${ts.replace('_', ' ')} of ${rupiah(status.grossAmount)} on attempt ${attempt}.`,
    })
  }

  return decision('ignored')
}

/**
 * @contract C8 State machines — applyPaymentEvent() · owner: ARC · via `@engine/domain/machines/payment`
 *
 * The only path from a provider event to a state change (design.md; PAYMENTS.md §4). PAY's thin
 * webhook handler verifies the signature on the raw body, calls `retrieve()` where the adapter
 * says so, and hands each normalised event here; the reconciler does the same with what
 * `retrieve()` reports, and a staff entry for a manual method arrives the same way. DOM implements
 * it (TASKS.md 19.4, on 18.2's machine runner) under the transaction rules of ./transactions.ts.
 */
import type { Money } from '../money/contract'
import type {
  NormalizedPaymentEvent,
  PaymentLookup,
  PaymentProviderId,
  ProviderState,
  RefundRequest,
  RefundResult,
} from './payment-vocabulary'

/**
 * What happened to one event. The handler answers 200 for every outcome; only a throw answers
 * 5xx (so the provider retries).
 * - `applied` — the payment moved; the reservations, the order and the outbox moved with it.
 * - `caught-up` — the event was early (events meant to come first are missing): the provider's
 *   state from `retrieve()` was applied along the table first, then the event.
 * - `duplicate` — the dedupe insert returned no row; the no-op was committed.
 * - `late-payment-resolved` — money after the reservation lapsed or the order closed: re-reserved
 *   and sold, or given back (refund or void) and the buyer told the same minute.
 * - `duplicate-payment-refused` — money for an order another attempt had already paid: this
 *   payment goes back whole, and the order's own payment is untouched.
 * - `ignored-stale` — behind the attempt (a `pending` after `paid`), or a refund already counted:
 *   recorded, no change.
 * - `unknown-attempt` — no attempt has this reference: recorded apart and alerted, the dedupe key
 *   not consumed; never a 5xx, or the provider retries for ever.
 * - `flagged` — money for another amount or currency than the attempt's charge, or a state the
 *   table cannot reach even after catching up: recorded and alerted for a human, never marked paid.
 */
export type ApplyPaymentEventOutcome =
  | 'applied'
  | 'caught-up'
  | 'duplicate'
  | 'late-payment-resolved'
  | 'duplicate-payment-refused'
  | 'ignored-stale'
  | 'unknown-attempt'
  | 'flagged'

/**
 * The provider operations the domain may need while applying, for the event's own provider and
 * seller — passed in by the caller, so the domain never imports an adapter (C7's PaymentGateway
 * satisfies this shape as it is). Each call is bounded by `DOMAIN_TX_TIMEOUTS.port` and must be
 * idempotent: a rollback after it succeeded means the provider's retry calls it again, so an
 * already-captured payment, an already-voided authorisation or a refund already made under the
 * same key is a success, not an error.
 */
export type PaymentPorts = {
  /** Authorise-capture methods only: capture while the reservations are locked and live. */
  readonly capture: ((providerRef: string, amount: Money) => Promise<void>) | null
  /** Void an authorisation or cancel a session: the late and duplicate paths for an authorisation. */
  readonly cancel: ((lookup: PaymentLookup) => Promise<void>) | null
  /** The late and duplicate paths for money that cannot be kept. */
  readonly refund: (input: RefundRequest) => Promise<RefundResult>
  /** The provider's word on one payment: the early path's catch-up. */
  readonly retrieve: (lookup: PaymentLookup) => Promise<ProviderState>
}

/**
 * Applies one event in ONE transaction of its own (a DomainTx: READ COMMITTED, the lock order):
 * 1. Find the attempt by `attemptRef`, else by `(provider, sellerId, providerRef)` — a plain read.
 *    None — or one of another seller than the event's, since a misrouted event is never applied to
 *    the wrong account: the event is recorded in `payment_events_unmatched` and alerted →
 *    `unknown-attempt`, and the dedupe key is NOT consumed, so the event still applies if its
 *    attempt turns up. An attempt row always exists before its provider hears of it:
 *    payment.start commits it before it calls `createSession()`.
 * 2. `INSERT … payment_events (provider, seller_id, provider_event_id, attempt_id) ON CONFLICT DO
 *    NOTHING RETURNING id` — no row: `duplicate`, and the no-op commits.
 * 3. Lock the attempt's order, then the attempt (`FOR UPDATE`), and read the attempt's status
 *    under that lock. The attempt's order never changes, so step 1 could read it unlocked.
 * 4. Classify. `paid` or `authorised` for another amount or currency than the attempt's charge:
 *    `flagged`. A move the table has: apply it (5). No move, and the event ranks at or below the
 *    attempt (`PAYMENT_STATUS_RANK`): `ignored-stale`. No move, and it ranks above: EARLY —
 *    `ports.retrieve()`, apply the provider's state along the table (through `CATCH_UP_VIA`),
 *    then the event if a move now exists: `caught-up`. Early is never ignored: a refund reported
 *    before the payment it refunds would otherwise vanish.
 * 5. Apply, every status write a compare-and-set:
 *    - Money in (`paid`, or `authorised` and then captured by us): lock the order's reservations in
 *      `target_key` order and check each is live (`expires_at > statement_timestamp()`) BEFORE
 *      `ports.capture()`; then convert them all, move the order to `paid`, write the outbox.
 *    - The late path — a reservation lapsed, or the order is `abandoned` or `cancelled`:
 *      reserveAll() again for this buyer (its lazy expiry retires what lapsed); if it holds, sell
 *      (`payment-paid` or `late-payment-kept`); if not, `late-payment-refused`, and the money goes
 *      back — `ports.cancel()` for an authorisation, else `ports.refund()` keyed `late:{attemptId}`.
 *    - A duplicate — the order is already `paid`, `fulfilling` or `completed` through another
 *      attempt (a VA and a QRIS both settled): this attempt moves to `paid` (the money is real),
 *      the order records `duplicate-payment-refused`, and the money goes back keyed
 *      `dup:{attemptId}`.
 *    - A refund applies only if `(attempt, refundRef)` is new AND `refundedTotal` rises above what
 *      is recorded; it applies the rise, not `amount`, and the cumulative figure — not the event's
 *      type — decides `partially_refunded` or `refunded`. One learnt from `retrieve()` has no ref
 *      of its own: it is recorded as `retrieve:{refundedTotal}` and applies the same rise. A refund
 *      nobody asked for in the admin, on the attempt that paid the order, is alerted
 *      (`order.refundedAtProvider`): the order stands and its item stays sold until staff decide.
 * Money going back is first recorded as owed (`refunds`, with its deterministic key), then asked of
 * the provider; if that call fails or times out, the event is still applied and committed with the
 * refund owed, and the reconciler asks again under the same key — an unreachable refund API never
 * keeps a buyer's money in silence. A failed `capture()` throws instead: the authorisation stands
 * and the provider's retry tries again. Any throw rolls back everything, the dedupe row included,
 * so the retry is applied, not swallowed as a duplicate (design.md decision 12).
 */
export type ApplyPaymentEvent = (
  event: NormalizedPaymentEvent,
  ports: PaymentPorts,
) => Promise<ApplyPaymentEventOutcome>

// ─── The reconciler ──────────────────────────────────────────────────────────────────────────

/** Money the domain owes back and has not yet heard the provider confirm. */
export type OwedRefund = {
  readonly refundId: number
  /** The provider and seller whose gateway is asked (secrets are per seller, PAYMENTS.md §8). */
  readonly provider: PaymentProviderId
  readonly sellerId: string
  /** `void` gives back an authorisation; it uses only the request's `providerRef`. */
  readonly action: 'refund' | 'void'
  readonly request: RefundRequest
}

/** An open attempt past its `expected_by`, for the reconciler to ask about. */
export type DueAttempt = {
  readonly provider: PaymentProviderId
  readonly sellerId: string
  readonly lookup: PaymentLookup
}

/**
 * What the reconciler (PAY; C13 `/api/x/cron/reconcile`, every 10 minutes) asks of the domain. It
 * calls providers OUTSIDE any transaction — holding no row while it waits — and hands back what it
 * learnt: `retrieve()` for each due attempt, applied through applyPaymentEvent() as a `retrieve`
 * event keyed `retrieve:…`; `refund()` or `cancel()` again, under the stored key, for each owed
 * refund, recorded through `recordOwed()`. `manual-required` opens the manual refund task
 * (PAYMENTS.md §5); an owed refund still unconfirmed after a day is alerted to the manager.
 */
export type Reconciliation = {
  readonly dueAttempts: (limit: number) => Promise<readonly DueAttempt[]>
  readonly owedRefunds: (limit: number) => Promise<readonly OwedRefund[]>
  readonly recordOwed: (
    refundId: number,
    result: RefundResult | { readonly kind: 'voided' },
  ) => Promise<void>
}

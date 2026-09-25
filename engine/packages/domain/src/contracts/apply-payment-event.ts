/**
 * @contract C8 State machines — applyPaymentEvent() · owner: ARC · via `@engine/domain/machines/payment`
 *
 * The only path from a provider event to a state change (design.md; PAYMENTS.md §4). PAY's thin
 * webhook handler verifies the signature on the raw body, calls `retrieve()` where the adapter
 * says so, and hands each normalised event here; the reconciler does the same with what
 * `retrieve()` reports. DOM implements it (TASKS.md 5.9, 5.17).
 */
import type { Money } from '../money/contract'
import type { NormalizedPaymentEvent, RefundRequest, RefundResult } from './payment-vocabulary'

/**
 * What happened to one event. The handler answers 200 for every outcome; only a throw answers
 * 5xx (so the provider retries).
 * - `applied` — the payment moved; the reservation, the order and the outbox moved with it.
 * - `duplicate` — the dedupe insert returned no row; the no-op was committed.
 * - `late-payment-resolved` — money arrived after the reservation lapsed: re-reserved and sold,
 *   or refunded / voided automatically, and the buyer told the same minute.
 * - `ignored-stale` — the table has no such move (a `pending` after `paid`); recorded, no change.
 * - `unknown-attempt` — no attempt has this `providerRef`: logged and alerted, never a 5xx, or the
 *   provider retries forever.
 * - `flagged` — `paid` or `authorised` for an amount or currency other than the attempt's charge:
 *   recorded and alerted for a human, never marked paid.
 */
export type ApplyPaymentEventOutcome =
  | 'applied'
  | 'duplicate'
  | 'late-payment-resolved'
  | 'ignored-stale'
  | 'unknown-attempt'
  | 'flagged'

/**
 * The provider operations the domain may need while applying, for the event's own provider.
 * The caller passes them in; C7's PaymentGateway satisfies this shape structurally, and the
 * domain never imports an adapter. Each must be idempotent — each is called inside the open
 * transaction, and a rollback after it succeeded means the provider's retry calls it again:
 * an already-captured payment or an already-voided authorisation is a success, not an error.
 */
export type PaymentPorts = {
  /** Authorise-capture methods only: capture while the reservation is live. */
  readonly capture: ((providerRef: string, amount: Money) => Promise<void>) | null
  /** Void an authorisation or cancel a session (the late path for an authorisation). */
  readonly cancel: ((providerRef: string) => Promise<void>) | null
  /** The late path for money that cannot be kept. */
  readonly refund: (input: RefundRequest) => Promise<RefundResult>
}

/**
 * Applies one event in ONE transaction, in this order:
 * 1. `INSERT … payment_events (provider, provider_event_id) ON CONFLICT DO NOTHING RETURNING id` —
 *    no row: `duplicate`.
 * 2. Find the attempt by `providerRef` (else `unknown-attempt`); check a `paid` / `authorised`
 *    amount and currency against its charge (else `flagged`).
 * 3. Move the payment by its table (a missing pair: `ignored-stale`). An authorisation is captured
 *    only while the reservation is live; then the reservation converts, the order moves to `paid`,
 *    and every domain event goes to the outbox — or, if the reservation lapsed, the late path.
 * Any throw rolls back everything, the dedupe row included, so the retry is applied, not
 * swallowed as a duplicate (design.md decision 12).
 */
export type ApplyPaymentEvent = (
  event: NormalizedPaymentEvent,
  ports: PaymentPorts,
) => Promise<ApplyPaymentEventOutcome>

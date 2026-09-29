/**
 * @contract C7 Provider interfaces — payments: the providerEventId rule, per adapter · owner: ARC · via `@engine/payments/contract`
 *
 * How each adapter derives a webhook's `providerEventId`, the dedupe key of its events (PAYMENTS.md
 * §2, C5–C8 `EventIdRule`): a provider's own event id where its notifications carry one, else a
 * hash of the state they report.
 */
import type { EventIdRule } from '@engine/domain/api'
import type { PaymentProviderId } from '@engine/domain/machines/payment'

/**
 * A payment notification's fields, named for what they mean; each adapter maps its own paths. A
 * state hash reads each field as the provider wrote it — `amount` its raw figure, before any unit
 * conversion — so changing a conversion never re-keys an event already recorded.
 */
export type StateHashField =
  | 'payment-id'
  | 'status'
  | 'fraud-status'
  | 'status-code'
  | 'amount'
  | 'refunded-total'
  | 'refund-id'

/**
 * How an adapter derives a webhook's `providerEventId` — with the provider and the seller, the
 * dedupe key unique in `payment_events` (PAYMENTS.md §2). Events the reconciler builds and
 * staff entries carry their own prefixes (`retrieve:`, `staff:`), so no rule below can collide.
 */
export type ProviderEventIdRule = EventIdRule<StateHashField>

export const PROVIDER_EVENT_ID_RULES = {
  stripe: { kind: 'provider-event-id', source: 'Event.id (evt_…)' },
  paypal: { kind: 'provider-event-id', source: 'webhook event id (WH-…)' },
  // PAYMENTS.md §2: transaction_id | transaction_status | fraud_status | status_code, so "pending"
  // and the later "settlement" never dedupe each other — plus the cumulative refunded amount,
  // because two partial refunds share every other field and the second would be swallowed.
  midtrans: {
    kind: 'state-hash',
    fields: ['payment-id', 'status', 'fraud-status', 'status-code', 'refunded-total'],
  },
  // Only if chosen (phase 25, D3): PAY confirms against recorded sandbox fixtures whether a native
  // event id exists; until then the state hash, which is always safe.
  xendit: { kind: 'state-hash', fields: ['payment-id', 'status', 'amount', 'refunded-total'] },
  doku: { kind: 'state-hash', fields: ['payment-id', 'status', 'amount', 'refunded-total'] },
  manual: { kind: 'staff-entry' },
  'bank-transfer': { kind: 'staff-entry' },
} as const satisfies { readonly [P in PaymentProviderId]: ProviderEventIdRule }

/**
 * Events the reconciler builds from `retrieve()` (source `retrieve`) key on the state they report,
 * as `retrieve:` + the hash, so re-reading an unchanged state every ten minutes dedupes instead of
 * piling up.
 */
export const RECONCILIATION_EVENT_ID_RULE = {
  kind: 'state-hash',
  fields: ['payment-id', 'status', 'amount', 'refunded-total'],
} as const satisfies ProviderEventIdRule

/**
 * @contract C7 Provider interfaces — the payment vocabulary · owner: ARC
 * Re-exported from `@engine/payments/contract` (C7) and `@engine/domain/machines/payment` (C8).
 *
 * Defined in the domain, not in payments, so the workspace graph stays acyclic: the domain stores
 * attempts, their SessionResults and their events, and applies events (applyPaymentEvent); the
 * payments package imports Money from here anyway. So payments → domain, never domain → payments,
 * and a provider call reaches the domain only through a port passed in (PAYMENTS.md §1: adapters
 * are stateless translators; all state lives in the domain). Provider ids are C1's, imported and
 * never redeclared; C7 maps each granular method below onto one of C1's method families.
 */
import type { LocaleCode, PaymentProviderId } from '@engine/config/schema'

import type { Money } from '../money/contract'

/** Every gateway the engine supports; a seller's config selects from these (PAYMENTS.md §2, §6). */
export type { PaymentProviderId } from '@engine/config/schema'

export type CardMethod = 'card'
export type WalletMethod =
  'apple-pay' | 'google-pay' | 'gopay' | 'shopeepay' | 'ovo' | 'dana' | 'paypal'
export type QrMethod = 'qris' | 'paynow'
/** Virtual accounts: automatic confirmation, refunds only by manual bank transfer. */
export type VirtualAccountMethod = 'va-bca' | 'va-mandiri' | 'va-bni' | 'va-bri' | 'va-permata'
/** Cash at a retail counter. Never offered for a unique item (COMMERCE.md §4). */
export type RetailMethod = 'alfamart' | 'indomaret'
export type PayLaterMethod = 'kredivo' | 'akulaku'
export type BankMethod = 'bank-transfer' | 'ideal' | 'sepa-debit'
/** Settled off-platform (on WhatsApp, in the showroom) and recorded like any other payment. */
export type ManualMethod = 'manual'

/**
 * One payment method as the buyer picks it. Granular (`va-bca`, not `va`) because caps and refund
 * rules differ per method (PAYMENTS.md §3); a seller's `methodOrder` sorts C1's families, and C7's
 * `PAYMENT_METHOD_FAMILY` says which family each method is in.
 */
export type PaymentMethodId =
  | CardMethod
  | WalletMethod
  | QrMethod
  | VirtualAccountMethod
  | RetailMethod
  | PayLaterMethod
  | BankMethod
  | ManualMethod

/** Text an editor wrote per locale (the "settled on WhatsApp" note, transfer instructions). */
export type LocalisedText = { readonly [L in LocaleCode]?: string }

/** Wire details: shown only to the buyer of this order and on documents, never on a public page. */
export type BankDetails = {
  readonly bankName: string
  readonly accountName: string
  readonly accountNumber: string
  readonly swift: string | null
  readonly iban: string | null
}

/**
 * What a gateway session gives the buyer (PAYMENTS.md §2). The domain stores it on the attempt
 * and replays it when the buyer retries; the adapter keeps nothing. In-process form (Date); C6
 * sends it to the browser as `WireSessionResult`.
 */
export type SessionResult =
  /** Midtrans Snap, Xendit, PayPal, Stripe Checkout. */
  | { readonly kind: 'redirect'; readonly url: string; readonly expiresAt: Date }
  /** Stripe Payment Element: publishable values only — never a secret key. */
  | { readonly kind: 'embedded'; readonly clientSecret: string; readonly publishableKey: string }
  /** A virtual account or a bank transfer: the buyer pays from their own bank app. */
  | {
      readonly kind: 'instructions'
      readonly reference: string
      readonly virtualAccount: string | null
      readonly bank: BankDetails | null
      readonly expiresAt: Date
    }
  /** QRIS: a phone cannot scan its own screen, so an e-wallet deep link rides along when given. */
  | {
      readonly kind: 'qr'
      readonly qrString: string
      readonly deeplink: string | null
      readonly expiresAt: Date
    }
  /** Settled off-platform; the confirmation says so in the editor's own words (KOI). */
  | { readonly kind: 'manual'; readonly note: LocalisedText }

/**
 * Why a payment failed, as a class a buyer's message and a dashboard can use — C11's
 * `payment.failed.reasonClass` is this type; the provider's own code rides along for staff.
 */
export type PaymentFailureClass = 'declined' | 'expired' | 'cancelled' | 'unavailable' | 'error'

/** What a payment event says happened. `paid` and `authorised` always carry the amount. */
export type PaymentEventBody =
  | { readonly type: 'pending' }
  | { readonly type: 'requires_action' }
  /** Authorised, not yet captured: the domain captures only while the reservation is live. */
  | { readonly type: 'authorised'; readonly amount: Money }
  /** `amount` is checked against the attempt's charge; a mismatch is alerted, never paid. */
  | { readonly type: 'paid'; readonly amount: Money }
  | {
      readonly type: 'failed'
      readonly reasonClass: PaymentFailureClass
      readonly providerCode: string | null
    }
  | { readonly type: 'expired' }
  /** An authorisation voided or a session cancelled before any money moved. */
  | { readonly type: 'voided' }
  /**
   * One refund: `amount` is this refund, `refundedTotal` the provider's cumulative figure after
   * it, `refundRef` the provider's id for it — two partial refunds are two events, never one. The
   * domain counts a refund by the rise in `refundedTotal`, never by `amount`, and only for a
   * `refundRef` it has not seen, so one refund seen by a webhook and by retrieve() counts once.
   */
  | {
      readonly type: 'refunded' | 'partially_refunded'
      readonly amount: Money
      readonly refundedTotal: Money
      readonly refundRef: string
    }
  | { readonly type: 'disputed'; readonly amount: Money; readonly disputeRef: string }
  /** The machine's `dispute_won` (outcome `won`) or `dispute_lost` (outcome `lost`). */
  | {
      readonly type: 'dispute_closed'
      readonly outcome: 'won' | 'lost'
      readonly disputeRef: string
    }

export type PaymentEventType = PaymentEventBody['type']

/**
 * Where the dedupe key came from, and so its shape. A webhook's id follows the adapter's rule
 * (C7 `PROVIDER_EVENT_ID_RULES`), unprefixed; an event the reconciler builds from `retrieve()`
 * keys on the state it reports, under `retrieve:`; a staff entry for a manual method under
 * `staff:`, with the admin action's id. A webhook confirmed by `retrieve()` stays a `webhook`
 * event: it keeps the delivery's id, so a redelivery still dedupes, and takes its body — type,
 * amounts — from what `retrieve()` reported.
 */
type EventSource =
  | { readonly source: 'webhook'; readonly providerEventId: string }
  | { readonly source: 'retrieve'; readonly providerEventId: `retrieve:${string}` }
  | { readonly source: 'staff'; readonly providerEventId: `staff:${string}` }

/**
 * A provider's news, normalised (PAYMENTS.md §2, §4) — the only input to applyPaymentEvent().
 * The dedupe key is `(provider, sellerId, providerEventId)`, unique in `engine.payment_events`,
 * so two sellers on one provider can never swallow each other's events.
 */
export type NormalizedPaymentEvent = PaymentEventBody &
  EventSource & {
    readonly provider: PaymentProviderId
    /**
     * The seller whose provider account it came from. Secrets are per seller and provider
     * (PAYMENTS.md §8), so a webhook arrives on its seller's own route
     * (`/api/x/webhooks/payments/[provider]/[seller]`, C13) and is verified by that seller's
     * gateway; a `retrieve` event takes the due attempt's seller, a `staff` entry its order's.
     */
    readonly sellerId: string
    /**
     * Our attempt reference as the provider echoes it back (Midtrans `order_id`, Stripe
     * `client_reference_id`, Xendit `external_id`, PayPal `custom_id`). The domain finds the
     * attempt by it first — the attempt row exists before the provider hears of it — and by
     * `providerRef` only when a provider's event carries no echo. One reference per attempt, so a
     * retry never reuses one (Midtrans rejects a reused `order_id`).
     */
    readonly attemptRef: string | null
    /** The provider's id for the payment; recorded on the attempt the first time it is seen. */
    readonly providerRef: string
    readonly occurredAt: Date
  }

/** How an adapter finds one payment: by the provider's id once it has one, else by ours. */
export type PaymentLookup = { readonly attemptRef: string; readonly providerRef: string | null }

/**
 * What `retrieve()` reports: the provider's word, used to confirm a webhook, to catch up an early
 * event and to reconcile. `unknown`: the provider does not know the payment — alert, never move.
 */
export type ProviderState = {
  readonly state:
    | 'pending'
    | 'requires_action'
    | 'authorised'
    | 'paid'
    | 'failed'
    | 'expired'
    | 'voided'
    | 'refunded'
    | 'partially_refunded'
    | 'unknown'
  readonly paid: Money | null
  readonly refundedTotal: Money | null
}

/**
 * The key a refund is asked with — deterministic, so asking again after a timeout, a rollback or
 * a crash refunds once. `late:{attemptId}` for a late payment refused and `dup:{attemptId}` for a
 * second payment on an order another attempt already paid — one each per attempt, because the
 * whole amount goes back — and `staff:{refundId}` for a refund staff asked for in the admin.
 */
export type RefundIdempotencyKey = `late:${string}` | `dup:${string}` | `staff:${string}`

/** A refund asked of a provider: always with its idempotency key, so a retry refunds once. */
export type RefundRequest = {
  readonly providerRef: string
  readonly amount: Money
  readonly reason: string
  readonly idempotencyKey: RefundIdempotencyKey
}

/**
 * What a provider did with a refund. Methods that cannot refund through the gateway (virtual
 * accounts, retail cash, QRIS past its window) answer `manual-required`: the domain opens a manual
 * refund task with the buyer's bank details, tracked to completion (PAYMENTS.md §5).
 */
export type RefundResult =
  | { readonly kind: 'refunded'; readonly providerRefundId: string; readonly amount: Money }
  | { readonly kind: 'pending'; readonly providerRefundId: string; readonly amount: Money }
  | {
      readonly kind: 'manual-required'
      readonly reason: 'method-cannot-refund' | 'refund-window-closed'
    }

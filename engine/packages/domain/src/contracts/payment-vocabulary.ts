/**
 * @contract C7 Provider interfaces — the payment vocabulary · owner: ARC
 * Re-exported from `@engine/payments/contract` (C7) and `@engine/domain/machines/payment` (C8).
 *
 * Defined in the domain, not in payments, so the workspace graph stays acyclic: the domain stores
 * attempts, their SessionResults and their events, and applies events (applyPaymentEvent); the
 * payments package imports Money from here anyway. So payments → domain, never domain → payments,
 * and a provider call reaches the domain only through a port passed in (PAYMENTS.md §1: adapters
 * are stateless translators; all state lives in the domain).
 */
import type { LocaleCode } from '@engine/config/schema'

import type { Money } from '../money/contract'

/** Every gateway the engine supports; a seller's config selects from these (PAYMENTS.md §2, §6). */
export type PaymentProviderId =
  'manual' | 'bank-transfer' | 'stripe' | 'midtrans' | 'xendit' | 'doku' | 'paypal'

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
 * rules differ per method (PAYMENTS.md §3); a config's method order may group them.
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

/** What a payment event says happened. `paid` and `authorised` always carry the amount. */
export type PaymentEventBody =
  | { readonly type: 'pending' }
  | { readonly type: 'requires_action' }
  /** Authorised, not yet captured: the domain captures only while the reservation is live. */
  | { readonly type: 'authorised'; readonly amount: Money }
  /** `amount` is checked against the attempt's charge; a mismatch is alerted, never paid. */
  | { readonly type: 'paid'; readonly amount: Money }
  | { readonly type: 'failed'; readonly reason: string | null }
  | { readonly type: 'expired' }
  /** An authorisation voided or a session cancelled before any money moved. */
  | { readonly type: 'voided' }
  /**
   * One refund: `amount` is this refund, `refundedTotal` the provider's cumulative figure after
   * it, `refundRef` the provider's id for it — two partial refunds are two events, never one.
   */
  | {
      readonly type: 'refunded' | 'partially_refunded'
      readonly amount: Money
      readonly refundedTotal: Money
      readonly refundRef: string
    }
  | { readonly type: 'disputed'; readonly amount: Money; readonly disputeRef: string }
  | {
      readonly type: 'dispute_closed'
      readonly outcome: 'won' | 'lost'
      readonly disputeRef: string
    }

export type PaymentEventType = PaymentEventBody['type']

/**
 * A provider's news, normalised (PAYMENTS.md §2, §4) — the only input to applyPaymentEvent().
 * `providerEventId` is the dedupe key, unique per provider in `engine.payment_events`, derived per
 * adapter by the rule C7 declares (`PROVIDER_EVENT_ID_RULES`); `providerRef` is the provider's
 * payment id, which the domain maps back to one attempt (one reference per attempt, so a retry
 * never reuses one — Midtrans rejects a reused `order_id`).
 */
export type NormalizedPaymentEvent = PaymentEventBody & {
  readonly provider: PaymentProviderId
  readonly providerEventId: string
  readonly providerRef: string
  /** A signed webhook, a reconciliation `retrieve()`, or a staff entry for manual methods. */
  readonly source: 'webhook' | 'retrieve' | 'staff'
  readonly occurredAt: Date
}

/** A refund asked of a provider: always with an idempotency key, so a retry refunds once. */
export type RefundRequest = {
  readonly providerRef: string
  readonly amount: Money
  readonly reason: string
  readonly idempotencyKey: string
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

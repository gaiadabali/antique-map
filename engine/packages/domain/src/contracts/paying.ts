/**
 * @contract C6 Commerce API — paying: the methods offered, an attempt, its status, payment links · owner: ARC · via `@engine/domain/api`
 *
 * How a checkout or a staff-sent link is paid (PAYMENTS.md §1–§3). The methods offered are the
 * ones routing allows for this seller, amount and lines, in the seller's method order; each says
 * what choosing it opens and how long it gives the buyer, so the page can say so before they
 * choose. An attempt is two transactions around one provider call, and the same key replays it.
 * Pay-link tokens are opaque and unguessable; an attempt id alone is never a credential.
 */
import type { PaymentMethodFamily } from '@engine/config/schema'

import type { OrderAccess } from './after-sale'
import type { SellerIdentity } from './checkout'
import type { BuyerOrderStatus, OrderedLineView } from './orders'
import type { PaymentMethodId, PaymentProviderId, SessionResult } from './payment-vocabulary'
import type { IdempotencyKey, PricedTotals, PricingToken } from './results'
import type { Duration, IsoInstant, Wire } from './scalars'

/** What choosing a method opens: the `SessionResult` kind its session will be (C7). */
export type PaymentPresentation = SessionResult['kind']

/** A method routing allows for this seller, amount and lines (PAYMENTS.md §3), in method order. */
export type PaymentOptionView = {
  readonly method: PaymentMethodId
  readonly provider: PaymentProviderId
  /** C1's family of the method (C7 `PAYMENT_METHOD_FAMILY`): how the page groups the methods. */
  readonly family: PaymentMethodFamily
  /**
   * C7 `MethodCapability.presentation`: sent to the provider, a card form on the page, a virtual
   * account to pay from a bank app, a QR to scan, or settled off-platform — told before choosing.
   */
  readonly presentation: PaymentPresentation
  /**
   * How long the buyer has once it starts ("pay within 15 minutes"): the method's session
   * lifetime, cut to end before the lock or hold behind it. The deadline itself arrives with
   * `PaymentStarted.expiresAt`.
   */
  readonly sessionTtl: Duration
  /** QRIS, e-wallets and virtual accounts confirm automatically; a transfer is confirmed by staff. */
  readonly confirmation: 'automatic' | 'manual'
  /** Back through the gateway, or by a manual bank transfer (virtual accounts, retail cash). */
  readonly refunds: 'gateway' | 'manual'
}

/**
 * A method chosen. Two transactions around one provider call, so no reservation row is held while
 * a gateway thinks:
 * 1. prices again, extends the order's checkout locks to the method's `sessionTtl` plus a margin
 *    — a hold or an offer hold on a line is superseded by the order's lock, lasting at least as
 *    long as that hold would have — closes any open attempt of the order, and COMMITS the new
 *    attempt with our reference, so an event can never arrive for an attempt the domain does not
 *    yet know. From here every reservation the attempt pays for carries the order's `order_id`;
 * 2. `createSession()`, outside any transaction;
 * 3. stores the SessionResult on the attempt and as the answer to `idempotencyKey`.
 * The same key replays the stored session. If the session was never stored (a crash between 2
 * and 3), the retry voids that attempt and creates another — a provider reference is never used
 * twice. Choosing another method keeps the bag and cancels the previous session.
 */
export type PaymentStartRequest = {
  readonly checkoutId: string
  readonly method: PaymentMethodId
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}

/** The gateway session as the browser receives it (dates as ISO strings). */
export type WireSessionResult = Wire<SessionResult>

export type PaymentStarted = {
  readonly attemptId: string
  readonly session: WireSessionResult
  readonly expiresAt: IsoInstant
  readonly lockExpiresAt: IsoInstant | null
  /**
   * The amount is above the daily transfer limit many buyers' banks set for this method — a
   * virtual account or a bank transfer, read from the dated limits beside C7's caps
   * (`payments/src/limits.ts`) — so the page warns before a transfer fails. False for any other.
   */
  readonly dailyCapWarning: boolean
}

/**
 * Polled by the payment-pending page, which switches to "Paid" by itself. Scoped to what the
 * attempt belongs to — its checkout, its pay link, or its order opened by the session or a lookup
 * (`OrderAccess`): an attempt id travels in gateway return URLs, so on its own it is never a
 * credential, and an attempt outside the scope answers `not-found`, exactly like an unknown one.
 * The scope IS a credential (a pay-link token, a lookup token), so this request never rides in a
 * URL's query string, where logs and referrers keep it: C13 serves it as a POST.
 */
export type PaymentStatusRequest = {
  readonly attemptId: string
  readonly scope:
    | { readonly kind: 'checkout'; readonly checkoutId: string }
    | { readonly kind: 'pay-link'; readonly token: string }
    | { readonly kind: 'order'; readonly access: OrderAccess }
}
/** What the poll answers: where the order now stands for its buyer, never an attempt's state. */
export type PaymentStatusView = {
  readonly attemptId: string
  readonly order: BuyerOrderStatus
  readonly next: 'wait' | 'paid' | 'choose-another-method'
}

/**
 * Opens `/pay/{token}`. The token is the credential — an unknown one answers `not-found` — and it
 * is already the page's own address (C10 `pay/[token]`), so reading it by GET exposes nothing new.
 */
export type PayLinkGetRequest = { readonly token: string }

/**
 * A staff-sent payment link, read: who sells, what for, how much, until when, and how it may be
 * paid. Its lines are priced already — an accepted offer at its stored AgreedPrice, a quote or a
 * proforma at its issued lines — and `pricing.token` is what `payLink.start` sends back.
 */
export type PayLinkView = {
  readonly token: string
  /** Why the link exists: an accepted offer, a staff hold, a proforma, a sale agreed on WhatsApp. */
  readonly reason: 'offer' | 'hold' | 'invoice' | 'sale'
  readonly status: 'open' | 'paid' | 'expired' | 'cancelled'
  readonly seller: SellerIdentity
  readonly lines: readonly OrderedLineView[]
  readonly pricing: PricedTotals
  /** The note staff wrote when sending it ("As agreed on WhatsApp…"), in their words. */
  readonly note: string | null
  /** Empty unless `open`. */
  readonly paymentOptions: readonly PaymentOptionView[]
  /** A payment already under way — the stored session, replayed so the page picks it up again. */
  readonly payment: PaymentStarted | null
  /** When the link stops taking payment — at the latest when the hold behind it ends. */
  readonly expiresAt: IsoInstant
  /** When the hold behind it ends; each method's session is sized to finish before it. */
  readonly holdExpiresAt: IsoInstant | null
  /** The order the link pays, once there is one (at the latest when a payment starts). */
  readonly order: { readonly number: string; readonly status: BuyerOrderStatus } | null
}

/**
 * A staff-sent payment link (accepted offer, hold, WhatsApp sale, proforma): `/pay/{token}`. Paid
 * like `payment.start` — two transactions around `createSession()` — and its first supersedes the
 * link's hold, offer hold or invoice hold with the order's checkout lock, lasting at least as long
 * as the hold would have, so a failed card never costs an institution its proforma's hold.
 */
export type PayLinkStartRequest = {
  readonly token: string
  readonly method: PaymentMethodId
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}

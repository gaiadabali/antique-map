/**
 * @contract C6 Commerce API — checkout, payment attempts and pay links · owner: ARC · via `@engine/domain/api`
 *
 * Checkout is data, not pages (COMMERCE.md §5): the server decides which steps a checkout has from
 * its seller, destination and lines, and the app renders those present. Totals are priced again
 * at every step and again when a payment attempt is created. The checkout lock is taken when the
 * buyer continues to payment and extended to the chosen method's session lifetime plus a margin.
 *
 * `checkoutId` and pay-link tokens are opaque and unguessable. An order number is sequential per
 * seller and so is never a credential: nothing here is addressed by it.
 */
import type { CountryCode } from '@engine/config/schema'

import type { Money } from '../money/contract'
import type { OrderStatus } from '../order/machine'
import type { PaymentStatus } from '../payment/machine'
import type { OrderAccess } from './after-sale'
import type { CartLineView, MarketView } from './cart'
import type { PaymentMethodId, PaymentProviderId, SessionResult } from './payment-vocabulary'
import type { ContactInput, InstitutionInput } from './requests'
import type { IdempotencyKey, PricedTotals, PricingToken } from './results'
import type { IsoDate, IsoInstant, Wire } from './scalars'

export type CheckoutStepId = 'contact' | 'delivery' | 'shipping' | 'payment' | 'confirmation'
export type CheckoutStep = {
  readonly id: CheckoutStepId
  readonly state: 'todo' | 'current' | 'done'
}

/** Who is selling: shown in full at checkout and on every document (PP 80/2019). */
export type SellerIdentity = {
  readonly id: string
  readonly legalName: string
  readonly country: CountryCode
  readonly registration: string | null
}

export type ShippingOptionView = {
  readonly optionId: string
  readonly kind: 'rate' | 'pickup' | 'quote-required'
  readonly carrier: string | null
  readonly service: string | null
  /** Null for `quote-required`: fine-art cover and oversize framed work are quoted, never guessed. */
  readonly price: Money | null
  /** The courier's rates were down: the seller's flat table, labelled as an estimate. */
  readonly isEstimate: boolean
  readonly eta: { readonly minDays: number; readonly maxDays: number } | null
  readonly sameDay: boolean
  /** Couriers cap art cover; above the seller's threshold a separate fine-art policy applies. */
  readonly cover: 'courier' | 'fine-art-policy' | 'none'
  /** DAP: paid on delivery, estimated here. DDP (where the seller enables it): inside `price`. */
  readonly duties: { readonly terms: 'DAP' | 'DDP'; readonly estimate: Money | null } | null
}

export type PickupOptionView = {
  readonly locationId: string
  /** "Ready at the showroom in 2 hours"; null when the promise cannot be made. */
  readonly readyWithinHours: number | null
}

/** A method routing allows for this seller, amount and lines (PAYMENTS.md §3), in method order. */
export type PaymentOptionView = {
  readonly method: PaymentMethodId
  readonly provider: PaymentProviderId
  /** QRIS, e-wallets and virtual accounts confirm automatically; a transfer is confirmed by staff. */
  readonly confirmation: 'automatic' | 'manual'
  /** Back through the gateway, or by a manual bank transfer (virtual accounts, retail cash). */
  readonly refunds: 'gateway' | 'manual'
}

export type CheckoutView = {
  readonly checkoutId: string
  readonly seller: SellerIdentity
  readonly market: MarketView
  readonly steps: readonly CheckoutStep[]
  readonly lines: readonly CartLineView[]
  readonly pricing: PricedTotals
  /** For an Indonesian destination the WhatsApp number comes first (updates arrive there). */
  readonly contact: { readonly whatsappFirst: boolean; readonly institutionAllowed: boolean }
  readonly delivery: {
    readonly addressShape: 'indonesia' | 'international' | null
    readonly pickup: readonly PickupOptionView[]
    readonly deliverBeforeAllowed: boolean
  }
  readonly shippingOptions: readonly ShippingOptionView[]
  readonly paymentOptions: readonly PaymentOptionView[]
  /** The checkout lock, once taken — the countdown is true, so it is shown. */
  readonly lock: { readonly expiresAt: IsoInstant } | null
  /** The order, once checkout reached payment. */
  readonly order: { readonly number: string; readonly status: OrderStatus } | null
}

/** Indonesia: searchable pickers down to the sub-district; the courier's area id is resolved here. */
export type IndonesianAddressInput = {
  readonly shape: 'indonesia'
  readonly recipientName: string
  readonly phone: string
  readonly street: string
  readonly subdistrictId: string
  /** Filled from the sub-district. */
  readonly postalCode: string
  /** Optional map pin. */
  readonly pin: { readonly lat: number; readonly lng: number } | null
  readonly notes: string | null
}

export type InternationalAddressInput = {
  readonly shape: 'international'
  readonly country: CountryCode
  readonly recipientName: string
  readonly phone: string | null
  readonly line1: string
  readonly line2: string | null
  readonly city: string
  readonly region: string | null
  readonly postalCode: string | null
}

export type AddressInput = IndonesianAddressInput | InternationalAddressInput

/**
 * An address in another country than the ship-to moves the destination and re-prices (notice
 * `repriced`). `deliverBefore` serves visitors: hotel or villa delivery before departure.
 */
export type DeliveryInput =
  | {
      readonly kind: 'ship'
      readonly address: AddressInput
      readonly deliverBefore: IsoDate | null
    }
  | { readonly kind: 'pickup'; readonly locationId: string; readonly collectorName: string | null }

/** Starts (or resumes) the checkout of one seller's group of the bag. */
export type CheckoutStartRequest = { readonly sellerId: string }
export type CheckoutContactRequest = {
  readonly checkoutId: string
  readonly contact: ContactInput
  readonly institution: InstitutionInput | null
}
export type CheckoutDeliveryRequest = {
  readonly checkoutId: string
  readonly delivery: DeliveryInput
}
export type CheckoutShippingRequest = { readonly checkoutId: string; readonly optionId: string }

/**
 * "Continue to payment". Prices again — a different figure than `acceptedPricing` names is
 * `price-changed` and nothing is reserved — routes the seller, takes the checkout locks through
 * reserve(), and creates the order in `pending_payment` with its snapshots.
 */
export type CheckoutContinueRequest = {
  readonly checkoutId: string
  readonly acceptedPricing: PricingToken
  readonly termsAccepted: true
  readonly idempotencyKey: IdempotencyKey
}

/**
 * A method chosen. Two transactions around one provider call, so no reservation row is held while
 * a gateway thinks:
 * 1. prices again, extends the order's locks to the method's `sessionTtl` plus a margin, closes
 *    any open attempt of the order, and COMMITS the new attempt with our reference — so an event
 *    can never arrive for an attempt the domain does not yet know;
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

/** A line as the order snapshotted it: title, image and price as sold, whatever changed since. */
export type OrderedLineView = {
  readonly lineId: string
  readonly title: string
  readonly imageUrl: string | null
  readonly quantity: number
  readonly unitPrice: Money
  readonly total: Money
}

/** Opens `/pay/{token}`. The token is the credential; an unknown one answers `not-found`. */
export type PayLinkGetRequest = { readonly token: string }

/**
 * A staff-sent payment link, read: who sells, what for, how much, until when, and how it may be
 * paid. The order behind it is already priced — an accepted offer at its stored AgreedPrice, a
 * quote or proforma at its issued lines — and `pricing.token` is what `payLink.start` sends back.
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
  readonly order: { readonly number: string; readonly status: OrderStatus } | null
}

/** A staff-sent payment link (accepted offer, hold, WhatsApp sale, proforma): `/pay/{token}`. */
export type PayLinkStartRequest = {
  readonly token: string
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
export type PaymentStatusView = {
  readonly attemptId: string
  readonly payment: PaymentStatus
  readonly order: OrderStatus
  readonly next: 'wait' | 'paid' | 'choose-another-method'
}

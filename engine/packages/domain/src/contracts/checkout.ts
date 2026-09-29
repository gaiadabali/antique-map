/**
 * @contract C6 Commerce API — checkout · owner: ARC · via `@engine/domain/api`
 *
 * Checkout is data, not pages (COMMERCE.md §5): the server decides which steps a checkout has from
 * its seller, destination and lines, and the app renders those present. Totals are priced again
 * at every step and again when a payment attempt is created (`./paying`). The checkout lock is
 * taken when the buyer continues to payment and extended to the chosen method's session lifetime
 * plus a margin.
 *
 * `checkoutId` is opaque and unguessable. An order number is sequential per seller and so is
 * never a credential: nothing here is addressed by it.
 */
import type { CountryCode } from '@engine/config/schema'

import type { Money } from '../money/contract'
import type { AppliedCode, CartLineView, MarketView } from './cart'
import type { BuyerOrderStatus } from './orders'
import type { PaymentOptionView, PaymentStarted } from './paying'
import type { ContactInput, InstitutionInput } from './requests'
import type { IdempotencyKey, PricedTotals, PricingToken } from './results'
import type { IsoDate, IsoInstant } from './scalars'

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

/**
 * A checkout as its page renders it: what each step offers and what the buyer chose so far, so
 * the page is rebuilt from it alone after a 303, a reload or a step's JSON answer. It holds the
 * buyer's own entries, so it is answered only to the checkout's owner — the cart cookie or the
 * session C13 binds it to. To anyone else a checkout id opens nothing: `not-found`.
 */
export type CheckoutView = {
  readonly checkoutId: string
  readonly seller: SellerIdentity
  readonly market: MarketView
  readonly steps: readonly CheckoutStep[]
  readonly lines: readonly CartLineView[]
  readonly pricing: PricedTotals
  /** The bag's codes, valued at this checkout's totals (set by `cart.applyCode`). */
  readonly codes: readonly AppliedCode[]
  readonly contact: {
    /** For an Indonesian destination the WhatsApp number comes first (updates arrive there). */
    readonly whatsappFirst: boolean
    readonly institutionAllowed: boolean
    readonly values: EnteredContact | null
  }
  readonly delivery: {
    readonly addressShape: 'indonesia' | 'international' | null
    readonly pickup: readonly PickupOptionView[]
    readonly deliverBeforeAllowed: boolean
    readonly chosen: ChosenDelivery | null
  }
  readonly shipping: {
    readonly options: readonly ShippingOptionView[]
    /** Null until `checkout.shipping` chose one, or once a new delivery no longer offers it. */
    readonly selectedOptionId: string | null
  }
  readonly paymentOptions: readonly PaymentOptionView[]
  /** The open attempt, its stored session replayed so the page picks it up again; else null. */
  readonly payment: PaymentStarted | null
  /** The checkout lock, once taken — the countdown is true, so it is shown. */
  readonly lock: { readonly expiresAt: IsoInstant } | null
  /** The order, once checkout reached payment: its standing as the buyer reads it (`./orders`). */
  readonly order: { readonly number: string; readonly status: BuyerOrderStatus } | null
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

/** The contact step as `checkout.contact` stored it: `ContactInput` less locale and consents. */
export type EnteredContact = Pick<
  ContactInput,
  'fullName' | 'email' | 'whatsapp' | 'whatsappConfirmed'
> & { readonly institution: InstitutionInput | null }

/** The delivery as `checkout.delivery` stored it, for its form to refill, and a shipment's label. */
export type ChosenDelivery =
  | (Extract<DeliveryInput, { kind: 'ship' }> & { readonly addressLines: readonly string[] })
  | Extract<DeliveryInput, { kind: 'pickup' }>

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

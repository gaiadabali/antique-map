/**
 * @contract C6 Commerce API — results, problems and notices · owner: ARC · via `@engine/domain/api`
 *
 * Domain errors are values, not exceptions, at every boundary a buyer can reach (design.md,
 * Error Handling). Each problem maps to one sentence that explains and instructs
 * (DESIGN-SYSTEM.md §10); the `code` is the stable key an app's message catalogue translates.
 * Problems never name another buyer, never echo a provider error and never show a stack.
 */
import type { CurrencyCode } from '@engine/config/schema'

import type { Money, PriceSet } from '../money/contract'
import type { PaymentMethodId } from './payment-vocabulary'
import type { IsoInstant } from './scalars'

/**
 * An opaque token naming the exact totals a response showed. A step that commits money (continue
 * to payment, choose a method, pay a link) sends back the token the buyer saw; the server prices
 * again and proceeds only if its own figures produce the same token — otherwise `price-changed`.
 * It carries no figure: the server never reads a price from a request, it only notices that the
 * buyer saw a different one.
 *
 * Anything the totals are made of — a line, a code (`cart.applyCode`, `cart.removeCode`), the
 * ship-to, the shipping choice, a price list, the day's FX rate — yields a new token, so a change
 * to the bag during a checkout makes that checkout's next committing step answer `price-changed`
 * with the new totals. There is no `checkout.applyCode`: the checkout's voucher field calls
 * `cart.applyCode` and reads the checkout again.
 */
export type PricingToken = string & { readonly __pricingToken: 'opaque, server-issued' }

/**
 * A client-generated UUID for a request that must not happen twice (a payment attempt, an offer,
 * a form submission). The same key returns the first result — for a payment, the stored
 * SessionResult (PAYMENTS.md §1 rule 6).
 */
export type IdempotencyKey = string

/** The totals a priced response shows, and the token that names them. */
export type PricedTotals = {
  readonly token: PricingToken
  readonly currency: CurrencyCode
  /**
   * At the prices this buyer pays, before discounts (C5 `buyerSubtotal`): the market list's — or,
   * on an approved retailer's quote, its trade tier's (D32).
   */
  readonly subtotal: Money
  readonly lineDiscount: Money
  readonly orderDiscount: Money
  /** Null until a shipping option is chosen (or none is needed). */
  readonly shipping: Money | null
  readonly shippingDiscount: Money
  readonly tax: Money
  readonly giftCard: Money
  /** What will be charged, with the market-currency estimate where one is allowed. */
  readonly grandTotal: PriceSet
}

/** Why a line cannot be bought as it stands (routing, stock, availability). One sentence each. */
export type LineProblem =
  /** An item in Indonesia that is not export-cleared, to a destination abroad (COMPLIANCE.md §1). */
  | { readonly code: 'export-blocked'; readonly lineId: string; readonly heldIn: string }
  /** No recorded location or export status: enquiry only, never defaulted (COMMERCE.md §2). */
  | { readonly code: 'location-unknown'; readonly lineId: string }
  /** No seller serves this line's location for this destination. */
  | { readonly code: 'destination-not-served'; readonly lineId: string }
  /** An option not offered for this destination (glass glazing outside Bali); `alternative` is. */
  | {
      readonly code: 'option-unavailable-here'
      readonly lineId: string
      readonly alternativeVariantId: number | null
    }
  | { readonly code: 'insufficient-stock'; readonly lineId: string; readonly available: number }
  /** A unique item or edition unit held or sold by someone else. Never says by whom. */
  | {
      readonly code: 'unavailable'
      readonly lineId: string
      readonly state: 'held' | 'sold'
      readonly heldUntil: IsoInstant | null
    }
  | { readonly code: 'not-for-sale'; readonly lineId: string }
  /** Price on request or offer only: bought through a request, never the bag. */
  | { readonly code: 'not-sold-by-cart'; readonly lineId: string }
  /** A unique item's quantity is always 1; an edition unit is itself unique. */
  | { readonly code: 'quantity-invalid'; readonly lineId: string; readonly max: number }

/** A request-level failure. `P` narrows the problems an operation can return. */
export type Problem =
  /** Someone else was first: offer alternatives and a want-list. */
  | {
      readonly code: 'reservation-conflict'
      readonly lineId: string | null
      readonly state: 'held' | 'sold'
      readonly heldUntil: IsoInstant | null
    }
  /** Lines that cannot be sold to this destination; nothing was reserved or charged. */
  | { readonly code: 'line-not-routable'; readonly lines: readonly LineProblem[] }
  /** Totals moved since the buyer last saw them: show `pricing`, never charge it silently. */
  | { readonly code: 'price-changed'; readonly pricing: PricedTotals }
  | {
      readonly code: 'code-invalid'
      readonly reason:
        | 'unknown'
        | 'expired'
        | 'not-started'
        | 'minimum-spend'
        | 'not-combinable'
        | 'usage-limit'
        | 'not-applicable'
        | 'wrong-currency'
        | 'no-balance'
      /** For `minimum-spend`: how much more qualifies, in the cart's currency. */
      readonly shortBy: Money | null
    }
  /** The method cannot take this payment: "try another method". */
  | {
      readonly code: 'method-unavailable'
      readonly method: PaymentMethodId
      readonly reason:
        'amount-cap' | 'not-for-unique-items' | 'provider-unavailable' | 'not-offered'
    }
  /** A lock, link, quote or counter-offer ran out; the buyer starts again from `restartAt`. */
  | { readonly code: 'expired'; readonly restartAt: 'cart' | 'item' | 'link' }
  /** The viewing slot went to someone else between listing and booking. */
  | { readonly code: 'slot-unavailable' }
  /** Lines outside the seller's return policy, as counsel words it; the rest may proceed. */
  | { readonly code: 'not-returnable'; readonly lineIds: readonly string[] }
  /** Field-level validation: every failing field at once, in plain language. */
  | { readonly code: 'invalid'; readonly fields: readonly FieldError[] }
  /** Unknown, or not the caller's: the same answer either way, so nothing can be enumerated. */
  | { readonly code: 'not-found' }
  /** The module is off for this brand (BRANDS.md §4). */
  | { readonly code: 'not-offered' }
  | { readonly code: 'rate-limited'; readonly retryAfterSeconds: number }

export type ProblemCode = Problem['code']

export type FieldError = {
  /** A dotted path into the request, e.g. `contact.whatsapp` or `lines.0.quantity`. */
  readonly path: string
  readonly reason: 'required' | 'format' | 'too-long' | 'not-allowed' | 'mismatch'
}

/** Something the buyer must see even though the request succeeded. */
export type Notice =
  /** The destination moved (e.g. into Indonesia) and the bag re-priced into `currency`. */
  | { readonly code: 'repriced'; readonly from: CurrencyCode; readonly to: CurrencyCode }
  /** A line changed while it sat in the bag (a price moved, stock ran low); see its problems. */
  | { readonly code: 'line-changed'; readonly lineId: string }
  | { readonly code: 'code-removed'; readonly codeText: string; readonly reason: 'no-longer-valid' }

/** Every operation answers with a value: its result, or the problems it may return. */
export type ApiResult<T, P extends Problem = Problem> =
  | { readonly ok: true; readonly data: T; readonly notices: readonly Notice[] }
  | { readonly ok: false; readonly problem: P }

/** Narrows `Problem` to the codes an operation declares. */
export type ProblemOf<C extends ProblemCode> = Extract<Problem, { readonly code: C }>

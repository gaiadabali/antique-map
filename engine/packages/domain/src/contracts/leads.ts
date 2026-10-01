/**
 * @contract C6 Commerce API — offers, holds and price requests · owner: ARC · via `@engine/domain/api`
 *
 * The gallery's real funnel (ANALYTICS.md §2): requests that are stored, put on the staff desk
 * and answered — never merely forwarded (KOI). Each is addressed by the product's public id; an
 * offer, a hold request or a price request never reserves by itself (COMMERCE.md §7).
 */
import type { Money, PriceSet } from '../money/contract'
import type { OfferEventFromBy, OfferStatus } from '../offer/machine'
import type { LeadContactInput, ProductPublicId } from './requests'
import type { IdempotencyKey } from './results'
import type { IsoInstant } from './scalars'
import type { Assert, Equals } from './type-assertions'

/**
 * Make an offer (module `purchase.offers`; non-binding at launch, D22).
 *
 * `proposal` is the one amount a client ever sends, and it is a bid, not a price: in the market
 * currency of the buyer's ship-to (anything else is `invalid`), judged on the server against the
 * private floor — below it the offer is declined at once, courteously — and charged only if staff
 * accept it, through an `offer` hold and a payment link. Posted without JavaScript it is one text
 * field, `proposal` — major units in ASCII digits, the currency taken from the ship-to — that C13's
 * decoder converts by the currency's exponent (`FORM_DECODING`); a script sends the Money itself.
 */
export type OfferSubmitRequest = {
  readonly productId: ProductPublicId
  readonly proposal: Money
  readonly message: string | null
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/** The buyer's answer: take the counter, bid again, or withdraw. */
export type OfferResponse =
  | { readonly action: 'accept' }
  | { readonly action: 'revise'; readonly proposal: Money; readonly message: string | null }
  | { readonly action: 'withdraw' }

/**
 * How a caller proves an offer is theirs, as `OrderAccess` does for an order: the account's session
 * and the offer's id — its `ref` (./storage.ts), which opens nothing without that session — so a
 * signed-in page holds no token (C2 `AccountOfferVM`); or the token its emails carry (`./links`,
 * purpose `offer`), for a buyer who is not signed in. `account` exists only where a brand signs
 * buyers in, and no brand takes offers at launch (D22, D50, D54); a handler refuses it elsewhere.
 */
export type OfferAccess =
  | { readonly kind: 'account'; readonly offerId: string }
  | { readonly kind: 'token'; readonly token: string }

/**
 * The answer sits at the top level, so a revised bid is the request's own `proposal` — the one
 * place a client amount is let through — and nothing nested can borrow that exemption.
 */
export type OfferRespondRequest = {
  readonly access: OfferAccess
  readonly idempotencyKey: IdempotencyKey
} & OfferResponse

export type OfferView = {
  readonly offerToken: string
  readonly productId: ProductPublicId
  readonly status: OfferStatus
  readonly proposal: Money
  /** Staff's counter while `countered`, open until `expiresAt` (the configured 72 h). */
  readonly counter: Money | null
  readonly expiresAt: IsoInstant | null
  /**
   * Once accepted: the private payment link and when the offer hold ends. The link charges the
   * agreed figure — the proposal or the counter — as stored at acceptance, converted once into
   * the charge currency (C5 `AgreedPrice`); nothing the buyer sends later changes it.
   */
  readonly payment: { readonly payLinkToken: string; readonly holdExpiresAt: IsoInstant } | null
}

/** Ask for a staff hold (module `purchase.holds`); a deposit option is v2. */
export type HoldRequest = {
  readonly productId: ProductPublicId
  readonly message: string | null
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

export type HoldRequestView = {
  readonly holdRequestToken: string
  readonly status: 'requested' | 'granted' | 'declined' | 'expired'
  /** Set once staff grant it: "On hold for you until Friday 14:00". */
  readonly heldUntil: IsoInstant | null
}

/**
 * Request price (module `purchase.requestPrice`): answered in place after an email or WhatsApp —
 * or by a person, for an item marked sensitive and for every item where the brand's unique prices
 * are on request (C1 `commerce.uniquePrices`, D50, v1.5). Stored and put on the staff desk either
 * way (`priceRequest.received`).
 */
export type PriceRequest = {
  readonly productId: ProductPublicId
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/**
 * The price revealed on the page — for the buyer's market, so the rupiah rule holds here too —
 * or `queued`: a person replies. The answer names no time: the page states the brand's reply
 * promise (C2 `reply`), which may be "the same working day, Singapore time" (G9), something a
 * count of hours cannot say (v1.5). Never `revealed` where unique prices are on request.
 */
export type PriceRequestResult =
  { readonly kind: 'revealed'; readonly price: PriceSet } | { readonly kind: 'queued' }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// The buyer's answers are exactly what the offer machine lets a buyer do.
type _AnswersMatchTheMachine = Assert<
  Equals<OfferResponse['action'], OfferEventFromBy<'submitted' | 'countered', 'buyer'>>
>

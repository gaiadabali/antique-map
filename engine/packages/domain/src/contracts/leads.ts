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
 * accept it, through an `offer` hold and a payment link.
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
 * Addressed by the opaque token in the counter email or the account. The answer sits at the top
 * level, so a revised bid is the request's own `proposal` — the one place a client amount is let
 * through — and nothing nested can borrow that exemption.
 */
export type OfferRespondRequest = {
  readonly offerToken: string
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

/** Request price (module `purchase.requestPrice`): answered in place after an email or WhatsApp. */
export type PriceRequest = {
  readonly productId: ProductPublicId
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/**
 * The price revealed on the page — for the buyer's market, so the rupiah rule holds here too —
 * or, for an item marked sensitive, a stated reply time from a specialist.
 */
export type PriceRequestResult =
  | { readonly kind: 'revealed'; readonly price: PriceSet }
  | { readonly kind: 'queued'; readonly replyWithinHours: number }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// The buyer's answers are exactly what the offer machine lets a buyer do.
type _AnswersMatchTheMachine = Assert<
  Equals<OfferResponse['action'], OfferEventFromBy<'submitted' | 'countered', 'buyer'>>
>

/**
 * @contract C8 State machines — reserve(), the one writer of reservations · owner: ARC
 * Entry `@engine/domain/reservations`.
 *
 * Every channel — web checkout, accepted offer, staff hold, institutional invoice, a manual
 * showroom sale — reserves through this one service, and nothing else writes a reservation
 * (ARCHITECTURE.md §6; COMMERCE.md §4). DOM implements it in `reservations/reserve.ts` (5.4);
 * SCH declares the table and its partial unique index (PARALLEL-TRACKS.md §1).
 */
import type { Duration } from '../contracts/scalars'
import type { Accepts, Assert, Equals } from '../contracts/type-assertions'
import type { ReservationKind, ReservationStatus } from './machine'

export type * from './machine'

// ─── Targets and the scalar key ──────────────────────────────────────────────────────────────

/** A unique item: its product's database id (not its public id). */
export type ProductTarget = { readonly kind: 'product'; readonly productId: number }
/** One numbered unit of an edition (#12/100), reserved exactly like a unique item. */
export type UnitTarget = { readonly kind: 'unit'; readonly unitId: number }
/** Counted stock: a variant at a stock location (on hand − reserved). */
export type StockTarget = {
  readonly kind: 'stock'
  readonly variantId: number
  readonly locationId: number
}

/** Targets that sell once: the partial unique index guards them. */
export type ExclusiveTarget = ProductTarget | UnitTarget
export type ReservationTarget = ExclusiveTarget | StockTarget

export type ExclusiveTargetKey = `product:${number}` | `unit:${number}`
export type CountedTargetKey = `stock:${number}@${number}`

/**
 * The scalar `target_key` reserve() writes on every row — and nothing else writes it. Payload
 * keeps polymorphic relations in a `_rels` table with no column to index, so the key is what the
 * partial unique index (`status IN ('active','converted')`, exclusive keys only) is built on.
 */
export type TargetKey = ExclusiveTargetKey | CountedTargetKey

export type TargetKeyOf<T extends ReservationTarget> = T extends ProductTarget
  ? `product:${number}`
  : T extends UnitTarget
    ? `unit:${number}`
    : CountedTargetKey

// ─── Owners, inputs, records ─────────────────────────────────────────────────────────────────

/** Who a reservation belongs to, per kind. Ids are database ids. */
export type ReservationOwnerByKind = {
  /** `cartId` null for a staff-made order (a showroom sale); `orderId` once the order exists. */
  readonly 'checkout-lock': {
    readonly cartId: number | null
    readonly orderId: number | null
    readonly customerId: number | null
  }
  /** Granted by staff (`grantedBy`) on a buyer's hold request, for an account or a guest. */
  readonly hold: {
    readonly holdRequestId: number | null
    readonly customerId: number | null
    readonly grantedBy: number
  }
  readonly offer: { readonly offerId: number; readonly customerId: number | null }
  readonly invoice: { readonly invoiceId: number; readonly customerId: number | null }
}

/** An exclusive target is reserved one at a time; counted stock by any positive quantity. */
type TargetAndQuantity =
  | { readonly target: ExclusiveTarget; readonly quantity: 1 }
  | { readonly target: StockTarget; readonly quantity: number }

type ReserveInputOf<K extends ReservationKind> = {
  readonly kind: K
  readonly owner: ReservationOwnerByKind[K]
  /** The kind's TTL from brand config (`commerce.ttl`), never beyond its maximum. */
  readonly ttl: Duration
} & TargetAndQuantity

export type ReserveInput = { [K in ReservationKind]: ReserveInputOf<K> }[ReservationKind]

type ReservationOf<K extends ReservationKind> = {
  readonly id: number
  readonly kind: K
  readonly owner: ReservationOwnerByKind[K]
  readonly target: ReservationTarget
  readonly targetKey: TargetKey
  readonly quantity: number
  readonly status: ReservationStatus
  readonly expiresAt: Date
  readonly createdAt: Date
}

export type Reservation = { [K in ReservationKind]: ReservationOf<K> }[ReservationKind]

/**
 * Someone else was first (a typed value — never a database error at a buyer). Carries no owner:
 * the buyer is told the item is held or sold, never by whom.
 */
export type ReservationConflict = {
  readonly targetKey: TargetKey
  readonly reason: 'held' | 'sold' | 'insufficient-stock'
  /** For `held`: when the blocking reservation lapses ("check back in 15 minutes"). */
  readonly heldUntil: Date | null
  /** For `insufficient-stock`: how many are left. */
  readonly available: number | null
}

export type ReserveResult =
  | { readonly ok: true; readonly reservation: Reservation }
  | { readonly ok: false; readonly conflict: ReservationConflict }

export type ReleaseReason =
  | 'buyer-cancelled'
  | 'staff-released'
  | 'payment-failed'
  | 'checkout-abandoned'
  | 'offer-withdrawn'
  | 'superseded'

export type ReverseReason = 'refunded' | 'return-accepted' | 'order-cancelled'

// ─── The service ─────────────────────────────────────────────────────────────────────────────

/**
 * The five operations. `Tx` is the caller's open transaction (DOM picks its concrete type): no
 * method opens or commits one of its own, so a reservation, a payment and an order commit together
 * or not at all. Expiry is judged by the database clock (`now()`), never an app server's.
 */
export type ReservationService<Tx> = {
  /**
   * First moves lapsed `active` rows for the same target to `expired` (returning their quantity to
   * `stock_levels.reserved`), then inserts — in the same transaction, so an expired-but-unswept
   * lock never blocks a buyer. The partial unique index turns a second live or sold reservation of
   * an exclusive target into `{ ok: false }`; counted stock reserves with the guarded UPDATE
   * (`on_hand - reserved >= quantity`, the row count is the answer).
   */
  reserve(tx: Tx, input: ReserveInput): Promise<ReserveResult>
  /** active → active, only forward, capped at the kind's maximum. A lapsed row: `expired`. */
  extend(
    tx: Tx,
    reservationId: number,
    until: Date,
  ): Promise<
    | { readonly ok: true; readonly reservation: Reservation }
    | { readonly ok: false; readonly reason: 'not-active' | 'expired' }
  >
  /** active → released; returns counted quantity to stock. */
  release(tx: Tx, reservationId: number, reason: ReleaseReason): Promise<'released' | 'not-active'>
  /**
   * active → converted, only while unexpired — the payment-in-time check. A lapsed lock is the
   * late path: reserve() again for the same buyer, or refund.
   */
  convert(
    tx: Tx,
    reservationId: number,
    orderId: number,
  ): Promise<
    { readonly ok: true } | { readonly ok: false; readonly reason: 'not-active' | 'expired' }
  >
  /** converted → reversed on a refund or an accepted return: the item is available again. */
  reverse(
    tx: Tx,
    reservationId: number,
    reason: ReverseReason,
  ): Promise<'reversed' | 'not-converted'>
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type HoldOwner = ReservationOwnerByKind['hold']
type Unique = { kind: 'product'; productId: 1 }
type _HoldOnAUniqueItem = Accepts<
  ReserveInput,
  { kind: 'hold'; owner: HoldOwner; ttl: Duration; target: Unique; quantity: 1 }
>
type _UniqueKeyShape = Assert<Equals<TargetKeyOf<ProductTarget>, `product:${number}`>>
type _TwoOfAUniqueItem = Accepts<
  ReserveInput,
  // @ts-expect-error — a one-of-one item is reserved one at a time: it sells once
  { kind: 'hold'; owner: HoldOwner; ttl: Duration; target: Unique; quantity: 2 }
>
type _OfferWithoutOffer = Accepts<
  ReserveInput,
  // @ts-expect-error — an offer reservation belongs to an offer
  { kind: 'offer'; owner: { customerId: 1 }; ttl: Duration; target: Unique; quantity: 1 }
>

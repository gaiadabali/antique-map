/**
 * @contract C8 State machines — what reserve() takes and returns · owner: ARC
 * Re-exported from `@engine/domain/reservations` beside the service (../reservations/contract.ts).
 *
 * Targets and their scalar key, owners per kind, inputs, records and results — split from the
 * service so each file answers one question (CONVENTIONS.md §2).
 */
import type { ReservationKind, ReservationStatus } from '../reservations/machine'
import type { Duration } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

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
 * partial unique index (../contracts/storage.ts `RESERVATION_ARBITER`) is built on, and what the
 * lock order sorts reservation rows by.
 */
export type TargetKey = ExclusiveTargetKey | CountedTargetKey

export type TargetKeyOf<T extends ReservationTarget> = T extends ProductTarget
  ? `product:${number}`
  : T extends UnitTarget
    ? `unit:${number}`
    : CountedTargetKey

// ─── Owners, inputs, records ─────────────────────────────────────────────────────────────────

/**
 * Who a reservation belongs to, per kind. Ids are database ids. Each kind's owner key — a checkout
 * lock's `orderId` (else its `cartId`), a hold's `holdRequestId`, an offer's `offerId`, an
 * invoice's `invoiceId` — is how reserve() knows a buyer is blocked by their own reservation; an
 * owner with no key (a staff hold with no request) is never "the same owner" as another.
 */
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
  /**
   * The kind's TTL from brand config (`commerce.ttl`), never beyond its maximum — and an
   * `invoice` hold's, the time to the due date the issuing staff set (D45, v1.5).
   */
  readonly ttl: Duration
  /**
   * The same buyer's live reservation of this target that this one replaces: a hold, an offer
   * hold or an invoice hold whose payment starts (payment.start and payLink.start replace it with
   * the order's checkout lock, lasting at least as long), or a lock applyPaymentEvent()'s step 0
   * re-takes for an authorised payment. reserve() releases it as `superseded` and inserts the new
   * row in the same call; it is ignored unless it names a live reservation of the same target (a
   * lapsed one is retired by reserve()'s own lazy expiry). That it is the same buyer's is the
   * caller's to prove (the session, the pay-link token, the authorisation): reserve() cannot tell
   * a guest's hold from a stranger's.
   */
  readonly supersedes: number | null
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

/** A non-empty list of reservation ids: the operations on existing rows take them in bulk. */
export type ReservationIds = readonly [number, ...number[]]

// ─── Results ─────────────────────────────────────────────────────────────────────────────────

/**
 * Someone else was first (a typed value — never a database error at a buyer). Carries no owner:
 * the buyer is told the item is held or sold, never by whom.
 */
export type ReservationConflict = {
  readonly targetKey: TargetKey
  readonly reason: 'held' | 'sold' | 'insufficient-stock'
  /**
   * For `held`: when the blocking reservation lapses ("check back in 15 minutes"); null when the
   * blocker kept vanishing before it could be read (RESERVE_CONFLICT_RETRIES) — rare, and honest.
   */
  readonly heldUntil: Date | null
  /** For `insufficient-stock`: how many are left. */
  readonly available: number | null
}

export type ReserveResult =
  | {
      readonly ok: true
      readonly reservation: Reservation
      /** The same owner already held it with the same kind: that reservation, returned as is. */
      readonly reused: boolean
    }
  | { readonly ok: false; readonly conflict: ReservationConflict }

export type ReserveAllResult =
  /** In the order of the inputs, whatever order reserveAll() took the rows in. */
  | { readonly ok: true; readonly reservations: readonly Reservation[] }
  /** Nothing was reserved; every target that conflicted is listed, not only the first. */
  | { readonly ok: false; readonly conflicts: readonly ReservationConflict[] }

/** All or nothing. A lapsed row is moved to `expired` on the way, whatever the outcome. */
export type ExtendResult =
  | { readonly ok: true; readonly reservations: readonly Reservation[] }
  | {
      readonly ok: false
      readonly expired: readonly number[]
      readonly notActive: readonly number[]
    }

/** All or nothing: on `ok: false` nothing converted, and the caller takes the late path. */
export type ConvertResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly expired: readonly number[]
      readonly notActive: readonly number[]
    }

/** Per row. A lapsed row answers `expired` (moved and emitted), never `released`. */
export type ReleaseOutcome = 'released' | 'expired' | 'not-active'

/** Per row. Counted stock is never reversed: a return restocks through an inventory movement. */
export type ReverseOutcome = 'reversed' | 'not-converted' | 'counted-stock'

export type PerReservation<O> = readonly { readonly reservationId: number; readonly outcome: O }[]

export type ReleaseReason =
  | 'buyer-cancelled'
  | 'staff-released'
  | 'payment-failed'
  | 'checkout-abandoned'
  | 'offer-withdrawn'
  | 'superseded'

/**
 * Why a sale is undone. Never a refund on its own: a refund issued at the provider leaves the item
 * sold until staff cancel the order or accept a return (PAYMENTS.md §5).
 */
export type ReverseReason = 'return-accepted' | 'order-cancelled'

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type HoldOwner = ReservationOwnerByKind['hold']
type Unique = { kind: 'product'; productId: 1 }
type Hold = { kind: 'hold'; owner: HoldOwner; ttl: Duration; supersedes: null; target: Unique }
type _HoldOnAUniqueItem = Accepts<ReserveInput, Hold & { quantity: 1 }>
type _UniqueKeyShape = Assert<Equals<TargetKeyOf<ProductTarget>, `product:${number}`>>
type _TwoOfAUniqueItem = Accepts<
  ReserveInput,
  // @ts-expect-error — a one-of-one item is reserved one at a time: it sells once
  Hold & { quantity: 2 }
>
type _OfferWithoutOffer = Accepts<
  ReserveInput,
  // @ts-expect-error — an offer reservation belongs to an offer
  {
    kind: 'offer'
    owner: { customerId: 1 }
    ttl: Duration
    supersedes: null
    target: Unique
    quantity: 1
  }
>
type _SupersedesIsStated = Accepts<
  ReserveInput,
  // @ts-expect-error — whether it replaces the buyer's own reservation is always said, even if null
  Omit<Hold, 'supersedes'> & { quantity: 1 }
>
// A refund alone never puts an item back on sale.
type _RefundIsNoReason = Assert<Equals<Extract<ReverseReason, 'refunded'>, never>>

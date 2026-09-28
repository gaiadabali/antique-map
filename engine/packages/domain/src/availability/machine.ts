/**
 * @contract C8 State machines — availability (derived) · owner: ARC · entry `@engine/domain/machines/availability`
 *
 * Per unique item or edition unit: `available → reserved → sold`, back to `available` when a
 * reservation expires, is released or is reversed; `withdrawn` when staff take it off sale
 * (COMMERCE.md §6). DERIVED — never a field anyone types, never stored: `DeriveAvailability`
 * computes it from the product's status and its live reservation. The table records how the
 * derived value moves, so every move emits `availability.changed`, which expires the item's
 * availability tags immediately (CONVENTIONS.md §12) and feeds sister sync.
 */
import type {
  EventsFrom,
  IsDeterministic,
  StateAfter,
  TransitionRow,
} from '../contracts/machine-types'
import type { Assert, Equals } from '../contracts/type-assertions'
import type { ReservationKind } from '../reservations/machine'

export const AVAILABILITY_STATES = ['available', 'reserved', 'sold', 'withdrawn'] as const
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number]

/**
 * How the value is derived: the first state whose condition holds wins.
 * - `sold` — the target has a `converted` reservation.
 * - `reserved` — it has an `active` reservation whose `expiresAt` is still ahead; an active row
 *   past its expiry reads as released whether or not the sweeper has run.
 * - `withdrawn` — the product is not `available` (not-for-sale, archived) or not published.
 * - `available` — otherwise.
 * `reserved` outranks `withdrawn` so a status edit cannot strand a buyer mid-payment: withdrawing
 * an item with a live reservation is refused until the reservation ends.
 */
export const AVAILABILITY_PRECEDENCE = [
  'sold',
  'reserved',
  'withdrawn',
  'available',
] as const satisfies readonly AvailabilityState[]

export const AVAILABILITY_TRANSITIONS = [
  {
    from: ['available'],
    event: 'reservation-activated',
    to: 'reserved',
    emits: 'availability.changed',
    by: ['system'],
  },
  // Released, or expired (swept or not).
  {
    from: ['reserved'],
    event: 'reservation-ended',
    to: 'available',
    emits: 'availability.changed',
    by: ['system'],
  },
  {
    from: ['reserved'],
    event: 'reservation-converted',
    to: 'sold',
    emits: 'availability.changed',
    by: ['system'],
  },
  // A refund or an accepted return: the item is for sale again.
  {
    from: ['sold'],
    event: 'reservation-reversed',
    to: 'available',
    emits: 'availability.changed',
    by: ['system'],
  },
  {
    from: ['available'],
    event: 'withdrawn',
    to: 'withdrawn',
    emits: 'availability.changed',
    by: ['staff'],
  },
  {
    from: ['withdrawn'],
    event: 'reinstated',
    to: 'available',
    emits: 'availability.changed',
    by: ['staff'],
  },
] as const satisfies readonly TransitionRow<AvailabilityState>[]

type Table = typeof AVAILABILITY_TRANSITIONS

export type AvailabilityEvent = Table[number]['event']
export type AvailabilityDomainEvent = Table[number]['emits']
export type AvailabilityEventFrom<F extends AvailabilityState> = EventsFrom<Table, F>
export type AvailabilityAfter<
  F extends AvailabilityState,
  E extends AvailabilityEventFrom<F>,
> = StateAfter<Table, F, E>

/** What the derivation reads. At most one live reservation exists for an exclusive target. */
export type AvailabilityInput = {
  readonly productStatus: 'available' | 'not-for-sale' | 'archived'
  readonly published: boolean
  readonly live: {
    readonly id: number
    readonly status: 'active' | 'converted'
    readonly kind: ReservationKind
    readonly expiresAt: Date
  } | null
  /** The instant expiry is judged at — passed in, so the derivation stays pure. */
  readonly at: Date
}

/**
 * The derived value. Viewer-relative states ("held for me", "in my checkout", "my offer
 * pending") are the loader's: it compares the reservation's owner with the viewer and puts only
 * a boolean in the view model — never another buyer's identity.
 */
export type Availability =
  | { readonly state: 'available' }
  | {
      readonly state: 'reserved'
      readonly kind: ReservationKind
      readonly until: Date
      readonly reservationId: number
    }
  | { readonly state: 'sold' }
  | { readonly state: 'withdrawn' }

/** Pure: DOM implements it from AVAILABILITY_PRECEDENCE; the loaders and the sister API call it. */
export type DeriveAvailability = (input: AvailabilityInput) => Availability

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
type _EveryStateRanked = Assert<Equals<(typeof AVAILABILITY_PRECEDENCE)[number], AvailabilityState>>
type _SoldComesBack = Assert<Equals<AvailabilityAfter<'sold', 'reservation-reversed'>, 'available'>>
// @ts-expect-error — a held item cannot be withdrawn under its buyer; the reservation ends first
type _WithdrawHeld = AvailabilityAfter<'reserved', 'withdrawn'>
// @ts-expect-error — nothing is sold without first being reserved
type _SoldWithoutReservation = AvailabilityAfter<'available', 'reservation-converted'>

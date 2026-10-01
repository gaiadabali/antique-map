/**
 * @contract C8 State machines — reservation · owner: ARC · entry `@engine/domain/machines/reservation`
 *
 * `active → converted | released | expired`, `active → active` on extend, `converted → reversed`
 * when an order is cancelled after payment or a return is accepted, which puts the item on sale
 * again — never on a refund alone (COMMERCE.md §6). Only the service's operations (./contract.ts)
 * move a row; nothing else writes a reservation. Lives beside the service contract, in the folder
 * DOM's `reserve.ts` will join (design.md).
 */
import type {
  EmittedBy,
  EventsFrom,
  IsDeterministic,
  StateAfter,
  TransitionRow,
} from '../contracts/machine-types'
import type { Assert, Equals } from '../contracts/type-assertions'

/** COMMERCE.md §4: who took the reservation, and so its TTL (named in brand config). */
export const RESERVATION_KINDS = ['checkout-lock', 'hold', 'offer', 'invoice'] as const
export type ReservationKind = (typeof RESERVATION_KINDS)[number]

export const RESERVATION_STATUSES = [
  'active',
  'converted',
  'released',
  'expired',
  'reversed',
] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

/**
 * The statuses the partial unique index covers (ARCHITECTURE.md §6): an exclusive target with a
 * live OR sold reservation admits no second one — the index guards sold items too.
 */
export const INDEXED_RESERVATION_STATUSES = [
  'active',
  'converted',
] as const satisfies readonly ReservationStatus[]

export const RESERVATION_TRANSITIONS = [
  {
    from: [null],
    event: 'reserve',
    to: 'active',
    emits: {
      'checkout-lock': 'checkoutLock.taken',
      hold: 'hold.granted',
      offer: 'offerHold.taken',
      invoice: 'invoiceHold.taken',
    },
    by: ['buyer', 'staff', 'system'],
  },
  {
    // The lock stretched to the chosen method's session lifetime plus a margin; a hold within its
    // maximum. Never an expired row: a lapsed lock is re-reserved on the late path instead.
    from: ['active'],
    event: 'extend',
    to: 'active',
    emits: {
      'checkout-lock': 'checkoutLock.extended',
      hold: 'hold.extended',
      offer: 'offerHold.extended',
      invoice: 'invoiceHold.extended',
    },
    by: ['buyer', 'staff', 'system'],
  },
  // Cancelled, abandoned, withdrawn — or `superseded` by the same buyer's next reservation.
  {
    from: ['active'],
    event: 'release',
    to: 'released',
    emits: {
      'checkout-lock': 'checkoutLock.released',
      hold: 'hold.released',
      offer: 'offerHold.released',
      invoice: 'invoiceHold.released',
    },
    by: ['buyer', 'staff', 'system'],
  },
  {
    // By the sweep (expireDue), by the next reserve() of the same target in its own transaction,
    // or by extend() / release() / convert() meeting a lapsed row — each emits the same event and,
    // for an exclusive target, `availability.changed`. An expired-but-unswept row already reads
    // as released everywhere.
    from: ['active'],
    event: 'expire',
    to: 'expired',
    emits: {
      'checkout-lock': 'checkoutLock.expired',
      hold: 'hold.expired',
      offer: 'offerHold.expired',
      invoice: 'invoiceHold.expired',
    },
    by: ['system'],
  },
  {
    // Sold: in the same transaction as the payment and the order. Counted stock leaves the
    // building: `on_hand` and `reserved` both drop by the quantity.
    from: ['active'],
    event: 'convert',
    to: 'converted',
    emits: {
      'checkout-lock': 'checkoutLock.converted',
      hold: 'hold.converted',
      offer: 'offerHold.converted',
      invoice: 'invoiceHold.converted',
    },
    by: ['system', 'staff'],
  },
  // An order cancelled after payment, or an accepted return: the item is available again.
  // Exclusive targets only; a returned counted item is a stock adjustment instead.
  {
    from: ['converted'],
    event: 'reverse',
    to: 'reversed',
    emits: 'reservation.reversed',
    by: ['system', 'staff'],
  },
] as const satisfies readonly TransitionRow<ReservationStatus>[]

type Table = typeof RESERVATION_TRANSITIONS

/**
 * The notice a kind's live reservation sends ahead of its end, once (ReservationService
 * .noticeExpiring), each kind with its own lead from brand config: a hold `holdNoticeHours`
 * before it ends, an invoice hold `invoiceNoticeHours` before its due date — the buyer's
 * reminder that the invoice is due (D45, v1.5). An offer hold would gain one the same way: an
 * entry here and a name in NoticeDomainEvent, an additive change.
 */
export const EXPIRING_NOTICE_EVENTS = {
  hold: 'hold.expiring',
  invoice: 'invoiceHold.expiring',
} as const satisfies { readonly [K in ReservationKind]?: string }
/** The kinds that send a notice ahead of their end. */
export type NoticeKind = keyof typeof EXPIRING_NOTICE_EVENTS

export type ReservationEvent = Table[number]['event']
export type ReservationEventFrom<F extends ReservationStatus | null> = EventsFrom<Table, F>
export type ReservationStatusAfter<
  F extends ReservationStatus | null,
  E extends ReservationEventFrom<F>,
> = StateAfter<Table, F, E>

/** The domain event a transition emits for a reservation of kind `K`. */
export type ReservationEmits<
  F extends ReservationStatus | null,
  E extends ReservationEventFrom<F>,
  K extends ReservationKind,
> =
  EmittedBy<Table, F, E> extends infer N
    ? N extends string
      ? N
      : N extends { readonly [P in K]: infer Name }
        ? Name
        : never
    : never

type Emitted = Table[number]['emits']
export type ReservationDomainEvent =
  Extract<Emitted, string> | Exclude<Emitted, string>[ReservationKind]

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type KindKeyed = Exclude<Emitted, string>
type _EveryKindNamed = Assert<Equals<keyof KindKeyed, ReservationKind>>
type _Deterministic = Assert<IsDeterministic<Table>>
type _HoldExpiry = Assert<Equals<ReservationEmits<'active', 'expire', 'hold'>, 'hold.expired'>>
type _SoldIsIndexed = Assert<
  Equals<(typeof INDEXED_RESERVATION_STATUSES)[number], 'active' | 'converted'>
>
// @ts-expect-error — a lapsed lock is never extended back to life; the late path re-reserves
type _ExtendExpired = ReservationStatusAfter<'expired', 'extend'>
// @ts-expect-error — a sale is undone only by reversing it, never by releasing it
type _ReleaseSold = ReservationStatusAfter<'converted', 'release'>
// @ts-expect-error — a released reservation cannot be sold; reserve() again
type _ConvertReleased = ReservationStatusAfter<'released', 'convert'>

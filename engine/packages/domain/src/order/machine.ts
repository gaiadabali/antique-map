/**
 * @contract C8 State machines — order · owner: ARC · entry `@engine/domain/machines/order`
 *
 * The lifecycle of the sale (COMMERCE.md §6). Orthogonal to the payment machine: an order carries
 * fulfilment, its payments carry the money, so "paid, partially refunded, then shipped" needs no
 * combined status. Nothing but a row of this table may change `orders.status`, each change is a
 * compare-and-set under the order's lock, and each writes its domain event to the outbox in the
 * same transaction. DOM implements the runtime (TASKS.md 18.2) against this data; its property
 * tests iterate `ORDER_TRANSITIONS`.
 *
 * Money no transition may keep has rows of its own, so it is never kept in silence: a late payment
 * (`late-payment-refused`) and a second payment on an order already paid
 * (`duplicate-payment-refused`) — each given back under its deterministic refund key. A refund or a
 * lost dispute at the provider moves no order: the order stands, its item stays sold, and staff
 * are alerted (`order.refundedAtProvider`) to cancel it or accept a return — a refund alone never
 * puts a one-of-one item back on sale.
 */
import type {
  EmittedBy,
  EventsFrom,
  EventsFromBy,
  IsDeterministic,
  StateAfter,
  TransitionRow,
} from '../contracts/machine-types'
import type { Assert, Equals } from '../contracts/type-assertions'

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'fulfilling',
  'completed',
  'cancelled',
  'abandoned',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_TRANSITIONS = [
  // Checkout reaches payment: snapshots written, the checkout lock already taken by reserve() —
  // or staff issue an invoice (D50, v1.5): the order exists from issue, its `invoice` holds
  // taken by reserve() until the due date; unpaid by then it lapses (`payment-lapsed`).
  {
    from: [null],
    event: 'reach-payment',
    to: 'pending_payment',
    emits: 'order.created',
    by: ['buyer', 'staff'],
  },
  {
    from: ['pending_payment'],
    event: 'payment-paid',
    to: 'paid',
    emits: 'order.paid',
    by: ['system'],
  },
  // Before payment: the reservation is released and the gateway session cancelled.
  {
    from: ['pending_payment'],
    event: 'cancel',
    to: 'cancelled',
    emits: 'order.cancelled',
    by: ['buyer', 'staff'],
  },
  // The attempts expired or failed and the reservations ended with no retry: the abandoned-order
  // sweep releases what is still held.
  {
    from: ['pending_payment'],
    event: 'payment-lapsed',
    to: 'abandoned',
    emits: 'order.abandoned',
    by: ['system'],
  },
  // A late payment (PAYMENTS.md §1 rule 5): kept only if reserveAll() takes the items again...
  {
    from: ['abandoned'],
    event: 'late-payment-kept',
    to: 'paid',
    emits: 'order.paid',
    by: ['system'],
  },
  // ...otherwise refunded or voided automatically, and the buyer told the same minute — also when
  // the lock lapsed, the item sold elsewhere and no sweep had yet abandoned the order. A payment
  // landing after the buyer cancelled is never kept either.
  {
    from: ['pending_payment'],
    event: 'late-payment-refused',
    to: 'abandoned',
    emits: 'order.latePaymentRefused',
    by: ['system'],
  },
  {
    from: ['abandoned'],
    event: 'late-payment-refused',
    to: 'abandoned',
    emits: 'order.latePaymentRefused',
    by: ['system'],
  },
  {
    from: ['cancelled'],
    event: 'late-payment-refused',
    to: 'cancelled',
    emits: 'order.latePaymentRefused',
    by: ['system'],
  },
  // A second payment on an order another attempt already paid (a VA and a QRIS both settled): the
  // order stays as it is and the second payment goes back whole.
  {
    from: ['paid'],
    event: 'duplicate-payment-refused',
    to: 'paid',
    emits: 'order.duplicatePaymentRefused',
    by: ['system'],
  },
  {
    from: ['fulfilling'],
    event: 'duplicate-payment-refused',
    to: 'fulfilling',
    emits: 'order.duplicatePaymentRefused',
    by: ['system'],
  },
  {
    from: ['completed'],
    event: 'duplicate-payment-refused',
    to: 'completed',
    emits: 'order.duplicatePaymentRefused',
    by: ['system'],
  },
  // The first shipment dispatched or a pickup ready — or, with nothing to ship (a digital gift
  // card), the first card sent.
  {
    from: ['paid'],
    event: 'fulfilment-started',
    to: 'fulfilling',
    emits: 'order.fulfilmentStarted',
    by: ['staff', 'system'],
  },
  // Every line delivered, collected or, a digital gift card, sent.
  {
    from: ['fulfilling'],
    event: 'fulfilment-completed',
    to: 'completed',
    emits: 'order.completed',
    by: ['staff', 'system'],
  },
  // After payment only staff cancel: the cancellation refunds through the payment machine and
  // reverses the reservations, which puts the items on sale again.
  {
    from: ['paid', 'fulfilling'],
    event: 'cancel',
    to: 'cancelled',
    emits: 'order.cancelled',
    by: ['staff'],
  },
  // Lines marked returned, stock or the item restored; a returned original's reservation reverses.
  {
    from: ['completed'],
    event: 'return-accepted',
    to: 'completed',
    emits: 'order.returnAccepted',
    by: ['staff'],
  },
] as const satisfies readonly TransitionRow<OrderStatus>[]

type Table = typeof ORDER_TRANSITIONS

export type OrderEvent = Table[number]['event']
export type OrderDomainEvent = Table[number]['emits']
/** The events allowed from `F` (`null`: creating the order). */
export type OrderEventFrom<F extends OrderStatus | null> = EventsFrom<Table, F>
/** The events a buyer (C6), staff (the admin) or the system may fire from `F`. */
export type OrderEventFromBy<
  F extends OrderStatus | null,
  A extends Table[number]['by'][number],
> = EventsFromBy<Table, F, A>
/** The status after `E` from `F` — only for a pair the table allows. */
export type OrderStatusAfter<
  F extends OrderStatus | null,
  E extends OrderEventFrom<F>,
> = StateAfter<Table, F, E>

/** The runtime DOM implements: a lookup in the table, typed so an illegal pair does not compile. */
export type OrderTransition = <F extends OrderStatus | null, E extends OrderEventFrom<F>>(
  from: F,
  event: E,
) => { readonly to: OrderStatusAfter<F, E>; readonly emits: EmittedBy<Table, F, E> }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
type _LatePaymentKept = Assert<Equals<OrderStatusAfter<'abandoned', 'late-payment-kept'>, 'paid'>>
type _BuyerCannotCancelPaid = Assert<Equals<OrderEventFromBy<'paid', 'buyer'>, never>>
// An unnarrowed status (straight from the database) allows no event at all: narrow it first.
type _NarrowFirst = Assert<Equals<OrderEventFrom<OrderStatus>, never>>
type _CancelAfterPayment = Assert<
  Equals<OrderEventFrom<'paid' | 'fulfilling'>, 'cancel' | 'duplicate-payment-refused'>
>
type _LateFromPending = Assert<
  Equals<OrderStatusAfter<'pending_payment', 'late-payment-refused'>, 'abandoned'>
>
// A second payment never changes where the sale stands.
type _DuplicateKeepsStatus = Assert<
  Equals<OrderStatusAfter<'fulfilling', 'duplicate-payment-refused'>, 'fulfilling'>
>
// @ts-expect-error — a cancelled order is never paid; its late payment is refused and refunded
type _CancelledThenPaid = OrderStatusAfter<'cancelled', 'payment-paid'>
// @ts-expect-error — a completed order cannot go back to awaiting payment
type _CompletedReopened = OrderStatusAfter<'completed', 'reach-payment'>

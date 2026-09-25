/**
 * @contract C8 State machines — order · owner: ARC · entry `@engine/domain/machines/order`
 *
 * The lifecycle of the sale (COMMERCE.md §6). Orthogonal to the payment machine: an order carries
 * fulfilment, its payments carry the money, so "paid, partially refunded, then shipped" needs no
 * combined status. Nothing but a row of this table may change `orders.status`, and each change
 * writes its domain event to the outbox in the same transaction. DOM implements the runtime
 * (TASKS.md 5.17) against this data; its property tests iterate `ORDER_TRANSITIONS`.
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
  // Checkout reaches payment: snapshots written, the checkout lock already taken by reserve().
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
  // The attempt expired or failed and no retry came within the window: the reservation is released.
  {
    from: ['pending_payment'],
    event: 'payment-lapsed',
    to: 'abandoned',
    emits: 'order.abandoned',
    by: ['system'],
  },
  // A late payment (PAYMENTS.md §1 rule 5): kept only if reserve() takes the item again...
  {
    from: ['abandoned'],
    event: 'late-payment-kept',
    to: 'paid',
    emits: 'order.paid',
    by: ['system'],
  },
  // ...otherwise refunded or voided automatically, and the buyer told the same minute. A payment
  // landing after the buyer cancelled is never kept either.
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
  // The first shipment dispatched or a pickup ready.
  {
    from: ['paid'],
    event: 'fulfilment-started',
    to: 'fulfilling',
    emits: 'order.fulfilmentStarted',
    by: ['staff', 'system'],
  },
  // Every line delivered or collected.
  {
    from: ['fulfilling'],
    event: 'fulfilment-completed',
    to: 'completed',
    emits: 'order.completed',
    by: ['staff', 'system'],
  },
  // After payment only staff cancel, and the cancellation refunds through the payment machine.
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
type _CancelAfterPayment = Assert<Equals<OrderEventFrom<'paid' | 'fulfilling'>, 'cancel'>>
// @ts-expect-error — a cancelled order is never paid; its late payment is refused and refunded
type _CancelledThenPaid = OrderStatusAfter<'cancelled', 'payment-paid'>
// @ts-expect-error — a completed order cannot go back to awaiting payment
type _CompletedReopened = OrderStatusAfter<'completed', 'reach-payment'>

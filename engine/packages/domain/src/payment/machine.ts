/**
 * @contract C8 State machines — payment (per attempt) · owner: ARC · entry `@engine/domain/machines/payment`
 *
 * The money's lifecycle, one row set per payment attempt (COMMERCE.md §6, PAYMENTS.md §4). Driven
 * by normalised provider events through applyPaymentEvent() — the only path from a provider to a
 * state change — plus the domain's own capture. It only moves forward. A pair the table lacks is
 * judged by PAYMENT_STATUS_RANK: an event at or behind the attempt is `ignored-stale` (a late
 * `pending` after `paid` changes nothing); one AHEAD of it is early — events meant to come first
 * are missing — and is caught up through `retrieve()` and CATCH_UP_VIA, never dropped.
 *
 * The exception to "forward only" is money arriving after we gave up. A `paid` (or an
 * authorisation) after `expired`, `failed` or `voided` is a LATE PAYMENT and has rows of its own:
 * ignoring it would keep a buyer's money silently (PAYMENTS.md §1 rule 5). Applying it hands the
 * order to the late-payment path: re-reserve and sell, or refund / void and tell the buyer.
 *
 * Refunds and disputes are the payment's own facts (`payment.*`). The order's revenue reversal,
 * `order.refunded` / `order.partiallyRefunded` (C11), is emitted beside them only for the attempt
 * that paid the order — giving back a late or duplicate payment reverses no revenue.
 *
 * Also exported here: the payment vocabulary and applyPaymentEvent()'s signature.
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
import type { PaymentEventType } from '../contracts/payment-vocabulary'

export type * from '../contracts/payment-vocabulary'
export type * from '../contracts/apply-payment-event'

export const PAYMENT_STATUSES = [
  'created',
  'pending',
  'requires_action',
  'authorised',
  'paid',
  'failed',
  'expired',
  'voided',
  'partially_refunded',
  'refunded',
  'disputed',
  'dispute_won',
  'dispute_lost',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

const OPEN = ['created', 'pending', 'requires_action', 'authorised'] as const
const REFUNDABLE = ['paid', 'partially_refunded', 'dispute_won'] as const

export const PAYMENT_TRANSITIONS = [
  {
    from: [null],
    event: 'create',
    to: 'created',
    emits: 'payment.created',
    by: ['buyer', 'staff'],
  },
  {
    from: ['created'],
    event: 'pending',
    to: 'pending',
    emits: 'payment.pending',
    by: ['provider'],
  },
  {
    from: ['created', 'pending'],
    event: 'requires_action',
    to: 'requires_action',
    emits: 'payment.actionRequired',
    by: ['provider'],
  },
  // Authorised, not captured: the domain captures only while the reservation is live.
  {
    from: ['created', 'pending', 'requires_action'],
    event: 'authorised',
    to: 'authorised',
    emits: 'payment.authorised',
    by: ['provider'],
  },
  {
    from: ['authorised'],
    event: 'captured',
    to: 'paid',
    emits: 'payment.captured',
    by: ['system'],
  },
  // Manual and bank-transfer payments are recorded by staff, exactly like a gateway's.
  { from: OPEN, event: 'paid', to: 'paid', emits: 'payment.settled', by: ['provider', 'staff'] },
  { from: OPEN, event: 'failed', to: 'failed', emits: 'payment.declined', by: ['provider'] },
  {
    from: OPEN,
    event: 'expired',
    to: 'expired',
    emits: 'payment.expired',
    by: ['provider', 'system'],
  },
  // An authorisation voided or a session cancelled before money moved.
  {
    from: OPEN,
    event: 'voided',
    to: 'voided',
    emits: 'payment.voided',
    by: ['provider', 'system', 'staff'],
  },
  // Late payments: never ignored, never kept silently. A card retried inside the provider's own
  // session after a decline can still authorise.
  {
    from: ['expired', 'failed'],
    event: 'authorised',
    to: 'authorised',
    emits: 'payment.lateAuthorised',
    by: ['provider'],
  },
  {
    from: ['expired', 'failed', 'voided'],
    event: 'paid',
    to: 'paid',
    emits: 'payment.lateSettled',
    by: ['provider', 'staff'],
  },
  // A refund, counted by the rise in the provider's cumulative figure: which of the two rows
  // applies is decided by that figure, not by the event's type.
  {
    from: REFUNDABLE,
    event: 'partially_refunded',
    to: 'partially_refunded',
    emits: 'payment.partiallyRefunded',
    by: ['provider', 'staff'],
  },
  {
    from: REFUNDABLE,
    event: 'refunded',
    to: 'refunded',
    emits: 'payment.refunded',
    by: ['provider', 'staff'],
  },
  // Disputes are the payment's alone — never an order status: the order stands, its evidence pack
  // is attached and the manager told. A normalised `dispute_closed` is `dispute_won` or
  // `dispute_lost` by its outcome.
  {
    from: ['paid', 'partially_refunded'],
    event: 'disputed',
    to: 'disputed',
    emits: 'payment.disputed',
    by: ['provider'],
  },
  {
    from: ['disputed'],
    event: 'dispute_won',
    to: 'dispute_won',
    emits: 'payment.disputeWon',
    by: ['provider'],
  },
  {
    from: ['disputed'],
    event: 'dispute_lost',
    to: 'dispute_lost',
    emits: 'payment.disputeLost',
    by: ['provider'],
  },
] as const satisfies readonly TransitionRow<PaymentStatus>[]

type Table = typeof PAYMENT_TRANSITIONS

export type PaymentMachineEvent = Table[number]['event']
export type PaymentDomainEvent = Table[number]['emits']
export type PaymentEventFrom<F extends PaymentStatus | null> = EventsFrom<Table, F>
export type PaymentEventFromBy<
  F extends PaymentStatus | null,
  A extends Table[number]['by'][number],
> = EventsFromBy<Table, F, A>
export type PaymentStatusAfter<
  F extends PaymentStatus | null,
  E extends PaymentEventFrom<F>,
> = StateAfter<Table, F, E>

/** The runtime DOM implements; applyPaymentEvent() treats a pair the table lacks as stale. */
export type PaymentTransition = <F extends PaymentStatus | null, E extends PaymentEventFrom<F>>(
  from: F,
  event: E,
) => { readonly to: PaymentStatusAfter<F, E>; readonly emits: EmittedBy<Table, F, E> }

/** Statuses in which the attempt's money is (still) with the seller. */
export type PaymentHeld = Extract<PaymentStatus, 'paid' | 'partially_refunded' | 'dispute_won'>

/**
 * How far along the money is. A move the table lacks is BEHIND when the event's status ranks at
 * or below the attempt's (`ignored-stale`), and EARLY when it ranks above (caught up, then applied).
 */
export const PAYMENT_STATUS_RANK = {
  created: 0,
  pending: 1,
  requires_action: 2,
  authorised: 3,
  paid: 4,
  failed: 4,
  expired: 4,
  voided: 4,
  partially_refunded: 5,
  disputed: 5,
  refunded: 6,
  dispute_won: 6,
  dispute_lost: 6,
} as const satisfies { readonly [S in PaymentStatus]: number }

/**
 * The early path's detour: to reach a status the table cannot enter from where the attempt stands,
 * a catch-up passes through this one first — money is taken before it is refunded or disputed. The
 * provider's `retrieve()` state is applied along it with each step's own effects (a catch-up
 * through `paid` converts the reservations or takes the late path like any payment).
 */
export const CATCH_UP_VIA = {
  partially_refunded: 'paid',
  refunded: 'paid',
  disputed: 'paid',
  dispute_won: 'disputed',
  dispute_lost: 'disputed',
} as const satisfies { readonly [S in PaymentStatus]?: PaymentStatus }

/** The machine event a normalised event type fires: `dispute_closed` splits by its outcome. */
export type MachineEventOf<T extends PaymentEventType> = T extends 'dispute_closed'
  ? 'dispute_won' | 'dispute_lost'
  : T

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
type Via = typeof CATCH_UP_VIA
type ViaReaches = { [S in keyof Via]: S extends PaymentEventFrom<Via[S]> ? true : false }
type _CatchUpPathsExist = Assert<Equals<ViaReaches[keyof Via], true>>
type _EveryBodyFiresAnEvent = Assert<
  Equals<Exclude<MachineEventOf<PaymentEventType>, PaymentMachineEvent>, never>
>
// Giving money back is the payment's fact; revenue reversal is the order's, emitted beside it.
type RefundEmits = EmittedBy<Table, 'paid', 'refunded' | 'partially_refunded'>
type _RefundsArePaymentFacts = Assert<RefundEmits extends `payment.${string}` ? true : false>
type _LateMoneyIsApplied = Assert<Equals<PaymentStatusAfter<'expired', 'paid'>, 'paid'>>
type _LateMoneyIsNamed = Assert<Equals<EmittedBy<Table, 'voided', 'paid'>, 'payment.lateSettled'>>
type _OnlyTheDomainCaptures = Assert<
  Equals<Extract<PaymentEventFromBy<'authorised', 'provider' | 'staff'>, 'captured'>, never>
>
// @ts-expect-error — monotonic: a late `pending` after `paid` is stale, not a transition
type _PaidBackToPending = PaymentStatusAfter<'paid', 'pending'>
// @ts-expect-error — nothing refunds money that was never taken
type _RefundBeforePaid = PaymentStatusAfter<'pending', 'refunded'>
// @ts-expect-error — a lost dispute is final
type _AfterDisputeLost = PaymentStatusAfter<'dispute_lost', 'refunded'>

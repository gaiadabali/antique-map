/**
 * @contract C8 State machines — payment (per attempt) · owner: ARC · entry `@engine/domain/machines/payment`
 *
 * The money's lifecycle, one row set per payment attempt (COMMERCE.md §6, PAYMENTS.md §4). Driven
 * by normalised provider events through applyPaymentEvent() — the only path from a provider to a
 * state change — plus the domain's own capture. It only moves forward: a pair the table lacks is
 * `ignored-stale` (a late `pending` after `paid` changes nothing), never an error and never a 5xx.
 *
 * The exception to "forward only" is money arriving after we gave up. A `paid` (or an
 * authorisation) after `expired`, `failed` or `voided` is a LATE PAYMENT and has rows of its own:
 * ignoring it would keep a buyer's money silently (PAYMENTS.md §1 rule 5). Applying it hands the
 * order to the late-payment path: re-reserve and sell, or refund / void and tell the buyer.
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
  // Late payments: never ignored, never kept silently.
  {
    from: ['expired'],
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
  // Refunds are the order's revenue reversal; their names are C11's (ANALYTICS.md §2).
  {
    from: REFUNDABLE,
    event: 'partially_refunded',
    to: 'partially_refunded',
    emits: 'order.partiallyRefunded',
    by: ['provider', 'staff'],
  },
  {
    from: REFUNDABLE,
    event: 'refunded',
    to: 'refunded',
    emits: 'order.refunded',
    by: ['provider', 'staff'],
  },
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

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
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

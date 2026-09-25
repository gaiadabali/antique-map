/**
 * @contract C8 State machines — offer · owner: ARC · entry `@engine/domain/machines/offer`
 *
 * `submitted → countered ⇄ submitted → accepted | declined | expired | withdrawn` (COMMERCE.md §6,
 * §7; design.md "Offer → accepted → paid"). Offers are non-binding at launch (D22). Acceptance is
 * one transaction with reserve({ kind: 'offer' }) and the payment link: if reserve() conflicts
 * (the item sold meanwhile) the acceptance fails and the offer does not move. After `accepted`,
 * the offer hold and the payment carry the story; the offer itself is done.
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

export const OFFER_STATUSES = [
  'submitted',
  'countered',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

export const OFFER_TRANSITIONS = [
  { from: [null], event: 'submit', to: 'submitted', emits: 'offer.received', by: ['buyer'] },
  // Below the private floor the system declines at once, courteously; staff decline the rest.
  {
    from: ['submitted'],
    event: 'decline',
    to: 'declined',
    emits: 'offer.declined',
    by: ['staff', 'system'],
  },
  // A counter stays open for the configured window (offerCounterHours, 72 h).
  {
    from: ['submitted'],
    event: 'counter',
    to: 'countered',
    emits: 'offer.countered',
    by: ['staff'],
  },
  { from: ['submitted'], event: 'accept', to: 'accepted', emits: 'offer.accepted', by: ['staff'] },
  // The buyer takes the counter as it stands...
  { from: ['countered'], event: 'accept', to: 'accepted', emits: 'offer.accepted', by: ['buyer'] },
  // ...or answers it with a new amount, which staff see as a fresh submission.
  { from: ['countered'], event: 'revise', to: 'submitted', emits: 'offer.revised', by: ['buyer'] },
  {
    from: ['submitted', 'countered'],
    event: 'withdraw',
    to: 'withdrawn',
    emits: 'offer.withdrawn',
    by: ['buyer'],
  },
  {
    from: ['submitted', 'countered'],
    event: 'expire',
    to: 'expired',
    emits: 'offer.expired',
    by: ['system'],
  },
] as const satisfies readonly TransitionRow<OfferStatus>[]

type Table = typeof OFFER_TRANSITIONS

export type OfferEvent = Table[number]['event']
export type OfferDomainEvent = Table[number]['emits']
export type OfferEventFrom<F extends OfferStatus | null> = EventsFrom<Table, F>
/** What C6 lets a buyer do from `F`, and what the admin lets staff do. */
export type OfferEventFromBy<
  F extends OfferStatus | null,
  A extends Table[number]['by'][number],
> = EventsFromBy<Table, F, A>
export type OfferStatusAfter<
  F extends OfferStatus | null,
  E extends OfferEventFrom<F>,
> = StateAfter<Table, F, E>

export type OfferTransition = <F extends OfferStatus | null, E extends OfferEventFrom<F>>(
  from: F,
  event: E,
) => { readonly to: OfferStatusAfter<F, E>; readonly emits: EmittedBy<Table, F, E> }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
type _BuyerOnACounter = Assert<
  Equals<OfferEventFromBy<'countered', 'buyer'>, 'accept' | 'revise' | 'withdraw'>
>
type _BuyerCannotAcceptOwnOffer = Assert<Equals<OfferEventFromBy<'submitted', 'buyer'>, 'withdraw'>>
// @ts-expect-error — a declined offer cannot be accepted later; the buyer makes a new offer
type _AcceptDeclined = OfferStatusAfter<'declined', 'accept'>
// @ts-expect-error — an accepted offer is not re-countered; its hold and payment link carry on
type _CounterAccepted = OfferStatusAfter<'accepted', 'counter'>

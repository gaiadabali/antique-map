/**
 * @contract C8 State machines — retail partner · owner: ARC · entry `@engine/domain/machines/retailer`
 *
 * A shop's standing in the partner programme (D31, D32; TASKS.md 28.5), held on its customer
 * record as `retailerStatus` (SCH). The statuses are C1's (`RETAILER_STATUSES`, declared once in
 * the leaf, which SCH's select and C2's view models read too); this table is how they move. Only
 * an `approved` retailer is priced at a trade tier, and only on its own quotes (C5 `TradeTerms`);
 * every other status — like every shopper, who has no account at all — pays the market list. The
 * applicant applies, or applies again after a decline; staff decide everything else in the admin.
 * Each change is a compare-and-set that writes its domain event to the outbox in the same
 * transaction, and NTF turns the events into email: received, approved (with the set-password link,
 * 28.1), declined, ended. DOM implements the runtime (28.5) against this table, in `retailers/`.
 */
import type { RetailerStatus } from '@engine/config/schema'

import type {
  EmittedBy,
  EventsFrom,
  EventsFromBy,
  IsDeterministic,
  StateAfter,
  TransitionRow,
} from '../contracts/machine-types'
import type { Assert, Equals } from '../contracts/type-assertions'

export type { RetailerStatus } from '@engine/config/schema'

/** The one status that prices at a trade tier: every other pays the market list. */
export type TradeEligibleStatus = Extract<RetailerStatus, 'approved'>

export const RETAILER_TRANSITIONS = [
  // The Partnership form (C6 `retailer.apply`), or staff enrolling a shop they already supply.
  {
    from: [null],
    event: 'apply',
    to: 'applied',
    emits: 'retailer.applied',
    by: ['buyer', 'staff'],
  },
  // Approval assigns the brand's default trade tier and emails a set-password link. From
  // `declined` it is staff reconsidering a refusal, or reinstating a partnership that ended.
  {
    from: ['applied', 'declined'],
    event: 'approve',
    to: 'approved',
    emits: 'retailer.approved',
    by: ['staff'],
  },
  {
    from: ['applied'],
    event: 'decline',
    to: 'declined',
    emits: 'retailer.declined',
    by: ['staff'],
  },
  // The partnership ends (C1 folds it into `declined`): new quotes are at the market list, and
  // quotes already issued keep the terms they were issued at unless staff cancel them.
  {
    from: ['approved'],
    event: 'end',
    to: 'declined',
    emits: 'retailer.partnershipEnded',
    by: ['staff'],
  },
  // A declined shop may apply again; staff see the earlier decision beside the new application.
  {
    from: ['declined'],
    event: 'reapply',
    to: 'applied',
    emits: 'retailer.reapplied',
    by: ['buyer'],
  },
] as const satisfies readonly TransitionRow<RetailerStatus>[]

type Table = typeof RETAILER_TRANSITIONS

export type RetailerEvent = Table[number]['event']
export type RetailerDomainEvent = Table[number]['emits']
export type RetailerEventFrom<F extends RetailerStatus | null> = EventsFrom<Table, F>
/** What the Partnership form lets an applicant do from `F`, and what the admin lets staff do. */
export type RetailerEventFromBy<
  F extends RetailerStatus | null,
  A extends Table[number]['by'][number],
> = EventsFromBy<Table, F, A>
export type RetailerStatusAfter<
  F extends RetailerStatus | null,
  E extends RetailerEventFrom<F>,
> = StateAfter<Table, F, E>

export type RetailerTransition = <F extends RetailerStatus | null, E extends RetailerEventFrom<F>>(
  from: F,
  event: E,
) => { readonly to: RetailerStatusAfter<F, E>; readonly emits: EmittedBy<Table, F, E> }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _Deterministic = Assert<IsDeterministic<Table>>
// Every status C1 declares is reached, and none other.
type _EveryStatusReached = Assert<Equals<Table[number]['to'], RetailerStatus>>
// An unnarrowed status (straight from the database) allows no event at all: narrow it first.
type _NarrowFirst = Assert<Equals<RetailerEventFrom<RetailerStatus>, never>>
// The applicant only ever applies: approval, decline and the end of a partnership are staff's.
type _ApplicantApplies = Assert<Equals<RetailerEventFromBy<'declined', 'buyer'>, 'reapply'>>
type _ApplicantCannotDecide = Assert<Equals<RetailerEventFromBy<'applied', 'buyer'>, never>>
type _OneTradeStatus = Assert<Equals<TradeEligibleStatus, 'approved'>>
// @ts-expect-error — only an approved partnership can end; an application is declined
type _EndAnApplication = RetailerStatusAfter<'applied', 'end'>
// @ts-expect-error — an approved partner does not apply again; staff change its terms instead
type _ReapplyWhileApproved = RetailerStatusAfter<'approved', 'reapply'>

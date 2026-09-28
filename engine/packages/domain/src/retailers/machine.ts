/**
 * @contract C8 State machines — retail partner · owner: ARC · entry `@engine/domain/machines/retailer`
 *
 * A business's standing in the partner programme — a shop, a hotel, a villa, a café or a company
 * alike (D31, D32, D36; TASKS.md 28.5), held on its customer record as `retailerStatus` (SCH). The
 * statuses are C1's (`RETAILER_STATUSES`, declared once in the leaf, which SCH's select and C2's
 * view models read too); this table is how they move. Only an `approved` retailer is priced at a
 * trade tier, and only on its own quotes (C5 `TradeTerms`); every other status — like every
 * shopper, who has no account at all — pays the market list. The applicant applies, or applies
 * again after a decline or an ended partnership; staff decide everything else in the admin. Each
 * change is a compare-and-set that writes its domain event to the outbox in the same transaction;
 * NTF turns the events into email after commit — never the request itself (C6 `retailer.apply`).
 *
 * Signing in (28.1, C13's auth routes): only `approved` signs in or sets a password. The first
 * password comes only from approval's set-password link; a reset link goes only to an approved
 * retailer that already has a password, and the reset form answers every address alike.
 * `applied`, `declined` and `ended` cannot sign in: sign-in answers them as an unknown email.
 *
 * Ending a partnership (D34) deactivates the account. The `end` transaction clears the password;
 * `retailer.partnershipEnded` then drives the sign-out — its consumer (DOM, idempotent) revokes
 * every session and every unused set-password or reset link of the account — and WEB's session
 * check reads the status on every request, treating anything but `approved` as signed out, so a
 * session the consumer has not reached yet opens nothing. The orders and history stay with the
 * owner; there is no former-partner area. DOM implements the runtime (28.5) in `retailers/`.
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
/** The one status that signs in or sets a password (C13's auth routes refuse the others). */
export type SignInStatus = Extract<RetailerStatus, 'approved'>

export const RETAILER_TRANSITIONS = [
  // The Partnership form (C6 `retailer.apply`), or staff enrolling a business they already supply.
  {
    from: [null],
    event: 'apply',
    to: 'applied',
    emits: 'retailer.applied',
    by: ['buyer', 'staff'],
  },
  // Approval writes the brand's `commerce.trade.defaultTier` to `customers.tradeTierId` (SCH) in
  // the same transaction and emails a set-password link. From `declined` it is staff reconsidering
  // a refusal; from `ended`, staff reinstating a partnership — with a new password, as the first.
  {
    from: ['applied', 'declined', 'ended'],
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
  // Staff move an approved retailer to another tier in force; the compare-and-set is on the tier
  // (`… WHERE retailer_status = 'approved' AND trade_tier_id = $from`). An owner's override that
  // removes a tier moves its retailers this way, one row each, in the same audited change (C1). A
  // quote already issued keeps the tier it was issued at (C5 `AgreedPrice.trade`).
  {
    from: ['approved'],
    event: 'change-tier',
    to: 'approved',
    emits: 'retailer.tierChanged',
    by: ['staff'],
  },
  // D34, above. A requested quote can no longer be issued at trade (C5 `TradeTermsResolution`);
  // an issued one keeps its terms, payable through its own link, unless staff cancel it.
  {
    from: ['approved'],
    event: 'end',
    to: 'ended',
    emits: 'retailer.partnershipEnded',
    by: ['staff'],
  },
  // Declined, or its partnership ended: the business may apply again through the same form, and
  // staff review it with the earlier decision beside it.
  {
    from: ['declined', 'ended'],
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
// The applicant only ever applies: approval, decline, tiers and the end are staff's.
type _ApplicantApplies = Assert<Equals<RetailerEventFromBy<'declined', 'buyer'>, 'reapply'>>
type _EndedAppliesAgain = Assert<Equals<RetailerEventFromBy<'ended', 'buyer'>, 'reapply'>>
type _ApplicantCannotDecide = Assert<Equals<RetailerEventFromBy<'applied', 'buyer'>, never>>
type _PartnerDecidesNothing = Assert<Equals<RetailerEventFromBy<'approved', 'buyer'>, never>>
type _OneTradeStatus = Assert<Equals<TradeEligibleStatus, 'approved'>>
type _SignInIsTrade = Assert<Equals<SignInStatus, TradeEligibleStatus>>
// D34: an ended partnership is its own status, not a refusal; a new tier is not a new standing.
type _EndDeactivates = Assert<Equals<RetailerStatusAfter<'approved', 'end'>, 'ended'>>
type _TierChangeKeepsStanding = Assert<
  Equals<RetailerStatusAfter<'approved', 'change-tier'>, 'approved'>
>
// @ts-expect-error — only an approved partnership can end; an application is declined
type _EndAnApplication = RetailerStatusAfter<'applied', 'end'>
// @ts-expect-error — an approved partner does not apply again; staff change its tier instead
type _ReapplyWhileApproved = RetailerStatusAfter<'approved', 'reapply'>
// @ts-expect-error — a tier belongs to an approved partner only
type _TierBeforeApproval = RetailerStatusAfter<'applied', 'change-tier'>

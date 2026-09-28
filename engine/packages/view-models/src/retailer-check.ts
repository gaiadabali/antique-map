/**
 * @contract C2 — type-level tests of the partner view models (D31, D32, D34, D36) · owner: ARC
 *
 * Compiled by `tsc` in `pnpm typecheck`, never run or exported. If a line here stops
 * compiling — or an `@ts-expect-error` stops being an error — the contract has drifted.
 *
 * Only an approved partner signs in (D34), so only its view model carries trade terms or a
 * reorder, and a reorder names its order and nothing else. The Partnership page holds no term
 * or price in any state; its cached forms hold nothing of the visitor; each streamed state is
 * its own kind, and `received` names no one. The standing is C1's statuses, and a minimum is
 * one of C5's rules as C1 declares it and C6 returns it, so each loader passes the domain's
 * value straight through.
 */
import type { RetailerStatus, TradeTierConfig } from '@engine/config/schema'
import type { QuoteReorderRequest, QuoteTradeView } from '@engine/domain/api'
import type { TradeMinimum } from '@engine/domain/money'

import type { OrderSummaryVM, ReorderIntentVM } from './commerce'
import type {
  ApprovedRetailerVM,
  MinimumOrderVM,
  PendingRetailerVM,
  RetailerStandingVM,
  SignedInVM,
} from './surfaces/account'
import type { PartnershipAccessVM, PartnershipVM } from './surfaces/partnership'
import type { QuoteTradeVM } from './surfaces/pay'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
type Accepts<T, U extends T> = U
type KeysOf<T> = T extends unknown ? keyof T : never

// C1 ⇄ C2: one standing per status C1 declares but `ended`, which no page shows (D34).
type _StandingIsC1s = Assert<Equals<RetailerStandingVM['status'] | 'ended', RetailerStatus>>
type _EndedShowsNowhere = Assert<Equals<Extract<RetailerStandingVM['status'], 'ended'>, never>>

// C1 ⇄ C5 ⇄ C6 ⇄ C2: a minimum is one of C5's rules — as config declares it, as a quote was
// issued with it, as the page shows it.
type _MinimumKindsAreC5s = Assert<Equals<MinimumOrderVM['kind'], TradeMinimum['kind']>>
type _ConfigMinimumIsC5s = Accepts<TradeMinimum, TradeTierConfig['minimum']>
type _TermsMinimumShows = Accepts<MinimumOrderVM, TradeMinimum>
type _QuoteMinimumShows = Accepts<MinimumOrderVM, QuoteTradeView['minimum']>

// D34: only an approved partner signs in, so no other standing reaches an account; a buyer
// never opens a partner's sections.
type _PendingHoldsNoTerms = Assert<Equals<Extract<PendingRetailerVM, { terms: unknown }>, never>>
type Customer = { fullName: string; email: string }
type Applied = Extract<PendingRetailerVM, { status: 'applied' }>
type Declined = Extract<PendingRetailerVM, { status: 'declined' }>
type SignedInAs<R, V> = {
  kind: 'signedIn'
  audience: 'retailer'
  customer: Customer
  nav: readonly []
  retailer: R
  view: V
}
type Profile = { section: 'profile'; profile: never }
type _PartnerSignsIn = Accepts<SignedInVM, SignedInAs<ApprovedRetailerVM, { section: 'terms' }>>
// @ts-expect-error — an applicant has no password until approval
type _ApplicantSignsIn = Accepts<SignedInVM, SignedInAs<Applied, Profile>>
// @ts-expect-error — nor does a declined one; an ended partnership has no standing to show (D34)
type _DeclinedSignsIn = Accepts<SignedInVM, SignedInAs<Declined, Profile>>
type _BuyerOpensTerms = Accepts<
  SignedInVM,
  // @ts-expect-error — a buyer's area has no partner sections
  {
    kind: 'signedIn'
    audience: 'buyer'
    customer: Customer
    nav: readonly []
    view: { section: 'terms' }
  }
>

// D32: only a partner reorders, and a reorder is its order's number — the server rebuilds the
// lines, so none can be added or changed.
type Reordering = {
  section: 'orders'
  orders: readonly OrderSummaryVM<ReorderIntentVM>[]
  pagination: null
}
type _PartnerReorders = Accepts<SignedInVM, SignedInAs<ApprovedRetailerVM, Reordering>>
type _BuyerReorders = Accepts<
  SignedInVM,
  // @ts-expect-error — a buyer's orders offer no reorder
  { kind: 'signedIn'; audience: 'buyer'; customer: Customer; nav: readonly []; view: Reordering }
>
type _ReorderIsItsOrder = Assert<Equals<keyof ReorderIntentVM, 'fromOrder'>>
// C2 ⇄ C6: the reorder is `quote.reorder`'s request but the idempotency key the page adds.
type _ReorderIsC6s = Accepts<Omit<QuoteReorderRequest, 'idempotencyKey'>, ReorderIntentVM>
type _ReorderKeysAreC6s = Assert<
  Equals<keyof ReorderIntentVM, Exclude<keyof QuoteReorderRequest, 'idempotencyKey'>>
>
// C2 ⇄ C6: a quote's waiver is C6's, kind for kind.
type _WaiverIsC6s = Assert<
  Equals<
    NonNullable<QuoteTradeVM['minimumWaiver']>['shortfall']['kind'],
    NonNullable<QuoteTradeView['minimumWaiver']>['shortfall']['kind']
  >
>

// The Partnership page: no term or price in any state, the standings' included; the cached
// forms hold nothing of this visitor; one kind per state; and `received` names no one.
type TermKeys = 'terms' | 'tier' | 'discountBps' | 'minimum' | 'trade' | 'price' | 'total'
type AccessKeys =
  | KeysOf<PartnershipAccessVM>
  | KeysOf<Extract<PartnershipAccessVM, { standing: unknown }>['standing']>
type _PartnershipShowsNoTerms = Assert<Equals<Extract<AccessKeys, TermKeys>, never>>
type Visitor = PartnershipVM['visitor']
type VisitorKeys = keyof Visitor['apply'] | keyof Visitor['signIn']
type _FormsAreEveryones = Assert<
  Equals<Extract<VisitorKeys, 'standing' | 'result' | 'failed' | 'error' | 'email'>, never>
>
type _OneKindPerState = Assert<
  Equals<
    PartnershipAccessVM['kind'],
    'received' | 'applyFailed' | 'signInFailed' | 'applied' | 'declined' | 'retailer'
  >
>
type _ReceivedNamesNoOne = Assert<
  Equals<keyof Extract<PartnershipAccessVM, { kind: 'received' }>, 'kind' | 'reply'>
>

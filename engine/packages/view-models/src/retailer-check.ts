/**
 * @contract C2 — type-level tests of the retailer view models (D31, D32) · owner: ARC
 *
 * Compiled by `tsc` in `pnpm typecheck`, never run or exported. If a line here stops
 * compiling — or an `@ts-expect-error` stops being an error — the contract has drifted.
 *
 * Only an approved retailer's view model carries trade terms or a reorder, and a signed-in
 * retailer who is not approved opens no priced section; the Partnership page holds no term or
 * price before an approved retailer signs in, and an application waiting on staff offers no
 * second one. The standing is C1's statuses, a minimum is one of C5's rules as C1 declares it
 * and C6 returns it, so each loader passes the domain's value straight through.
 */
import type { RetailerStatus, TradeTierConfig } from '@engine/config/schema'
import type { QuoteTradeView } from '@engine/domain/api'
import type { TradeMinimum } from '@engine/domain/money'

import type { OrderSummaryVM, ReorderIntentVM } from './commerce'
import type {
  ApprovedRetailerVM,
  MinimumOrderVM,
  PendingRetailerVM,
  RetailerStandingVM,
  SignedInVM,
} from './surfaces/account'
import type { PartnershipAccessVM } from './surfaces/partnership'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
type Accepts<T, U extends T> = U
type KeysOf<T> = T extends unknown ? keyof T : never

// C1 ⇄ C2: one standing per status C1 declares, and none other.
type _StandingIsC1s = Assert<Equals<RetailerStandingVM['status'], RetailerStatus>>

// C1 ⇄ C5 ⇄ C6 ⇄ C2: a minimum is one of C5's rules — as config declares it, as a quote was
// issued with it, as the page shows it.
type _MinimumKindsAreC5s = Assert<Equals<MinimumOrderVM['kind'], TradeMinimum['kind']>>
type _ConfigMinimumIsC5s = Accepts<TradeMinimum, TradeTierConfig['minimum']>
type _TermsMinimumShows = Accepts<MinimumOrderVM, TradeMinimum>
type _QuoteMinimumShows = Accepts<MinimumOrderVM, QuoteTradeView['minimum']>

// D31: a retailer who is not approved holds no trade terms and opens no priced section; a
// buyer never opens a retailer's.
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
type _PendingSeesItsStanding = Accepts<
  SignedInVM,
  SignedInAs<Applied, { section: 'profile'; profile: never }>
>
type Quotes = { section: 'quotes'; quotes: readonly []; request: { href: string } }
// @ts-expect-error — a retailer who is not approved never opens a priced section
type _PendingOpensQuotes = Accepts<SignedInVM, SignedInAs<Applied, Quotes>>
type _BuyerOpensTerms = Accepts<
  SignedInVM,
  // @ts-expect-error — a buyer's area has no retailer sections
  {
    kind: 'signedIn'
    audience: 'buyer'
    customer: Customer
    nav: readonly []
    view: { section: 'terms' }
  }
>

// D32: only an approved retailer reorders; a former partner keeps its orders, without one.
type Reordering = {
  section: 'orders'
  orders: readonly OrderSummaryVM<ReorderIntentVM>[]
  pagination: null
}
type Kept = { section: 'orders'; orders: readonly OrderSummaryVM<null>[]; pagination: null }
type _PartnerReorders = Accepts<SignedInVM, SignedInAs<ApprovedRetailerVM, Reordering>>
type _FormerPartnerKeepsOrders = Accepts<SignedInVM, SignedInAs<Declined, Kept>>
// @ts-expect-error — a former partner's orders offer no reorder
type _FormerPartnerReorders = Accepts<SignedInVM, SignedInAs<Declined, Reordering>>
type _BuyerReorders = Accepts<
  SignedInVM,
  // @ts-expect-error — nor does a buyer's
  { kind: 'signedIn'; audience: 'buyer'; customer: Customer; nav: readonly []; view: Reordering }
>

// The Partnership page: no term or price in any state it has before sign-in, the standing's
// included; an application waiting on staff offers no second one, a declined one does.
type TermKeys = 'terms' | 'tier' | 'discountBps' | 'minimum' | 'trade' | 'price' | 'total'
type AccessKeys =
  | KeysOf<PartnershipAccessVM>
  | KeysOf<Extract<PartnershipAccessVM, { standing: unknown }>['standing']>
type _PartnershipShowsNoTerms = Assert<Equals<Extract<AccessKeys, TermKeys>, never>>
type Apply = Extract<PartnershipAccessVM, { kind: 'visitor' }>['apply']
type _DeclinedAppliesAgain = Accepts<
  PartnershipAccessVM,
  { kind: 'applicant'; standing: Declined; apply: Apply }
>
type _AppliedAppliesAgain = Accepts<
  PartnershipAccessVM,
  // @ts-expect-error — an application waiting on staff offers no second one
  { kind: 'applicant'; standing: Applied; apply: Apply }
>

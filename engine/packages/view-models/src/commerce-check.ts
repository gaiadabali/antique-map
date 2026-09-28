/**
 * @contract C2 — type-level tests of the commerce view models · owner: ARC
 *
 * Compiled by `tsc` in `pnpm typecheck`, never run or exported. If a line here stops
 * compiling — or an `@ts-expect-error` stops being an error — the contract has drifted.
 *
 * The money rules for everything a view model hands a component to post back: no intent
 * carries a Money, or a field named for a figure only the server computes (C6
 * `IsServerPriced`, the same guard every C6 request passes); the totals a page shows never
 * carry the token that commits them. The purchase panel cannot pair a state with a price or
 * an action it rules out. The account's pages are exactly C10's sections, and C1's FX buffer
 * is C5's to the character. A hidden field is never asked for, a tick box posts `'true'`, and
 * a request-time part never enters a cached read. The partner rules (D31–D36) are
 * `retailer-check.ts`'s.
 */
import type { AccountSection } from '@engine/config/routes'
import type { CurrencyCode, MoneyConfig } from '@engine/config/schema'
import type { IsServerPriced } from '@engine/domain/api'
import type { FxSnapshot } from '@engine/domain/money'

import type { CardVM } from './cards'
import type { CachedPart, LineIntent, Money, PriceVM, Streamed } from './common'
import type { AppliedCodeVM, ReorderIntentVM, TotalsVM } from './commerce'
import type {
  AccountOfferVM,
  AccountSectionVM,
  AccountViewingVM,
  AccountVM,
} from './surfaces/account'
import type { CartCheckoutVM, CartLineVM } from './surfaces/cart'
import type { CheckoutVM } from './surfaces/checkout'
import type { CheckboxFieldVM, FormVM, HiddenFieldVM } from './surfaces/form'
import type { GiftCardAmountVM } from './surfaces/gift-card'
import type { OrderPaymentVM } from './surfaces/order'
import type { PayVM, QuoteVM } from './surfaces/pay'
import type { PartnershipVM } from './surfaces/partnership'
import type {
  HeldByOtherVM,
  HeldForMeVM,
  PurchaseActionVM,
  SoldVM,
  UniquePanelVM,
} from './surfaces/purchase'
import type { WishlistVM } from './surfaces/wishlist'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T

/** Every payload a commerce VM hands a component to post. A new intent is added here. */
type Intents =
  | LineIntent
  | Extract<PurchaseActionVM, { action: 'buy' }>['line']
  | NonNullable<CardVM['wishlist']>
  | GiftCardAmountVM['line']
  | CartLineVM['intents']
  | CartCheckoutVM['start']
  | AppliedCodeVM['remove']
  | CheckoutVM['intents']
  | NonNullable<PayVM['intents']>['start']
  | NonNullable<NonNullable<PayVM['intents']>['poll']>
  | NonNullable<QuoteVM['intents']>
  | Extract<OrderPaymentVM, { state: 'pending' }>['poll']
  | NonNullable<AccountOfferVM['respond']>
  | NonNullable<AccountViewingVM['cancel']>
  | ReorderIntentVM

// No intent carries a price a client could send back as authoritative.
type _NoIntentCarriesAPrice = Assert<Equals<IsServerPriced<Intents>, true>>

// @ts-expect-error — an intent carrying a Money is caught
type _MoneyInAnIntent = Assert<Equals<IsServerPriced<{ lineId: string; total: Money }>, true>>
type _FigureInAnIntent = Assert<
  // @ts-expect-error — and so is a bare number named for a server figure
  Equals<IsServerPriced<CheckoutVM['intents'] & { pay: { grandTotal: number } }>, true>
>

// The figures a page shows never carry the token that commits them; the token is in `intents`.
type _TotalsCarryNoToken = Assert<Equals<Extract<keyof TotalsVM, 'token'>, never>>

// The account's pages are exactly C10's `ACCOUNT_SECTIONS`: its signed-in sections, and the
// signed-out pages an emailed link or a forgotten password lands on.
type SignedOutPage = Exclude<AccountVM['session']['kind'], 'signedOut' | 'signedIn'>
type _AccountSectionsAreC10s = Assert<
  Equals<AccountSectionVM<null>['section'] | SignedOutPage, AccountSection>
>

// A hidden field is sent, never asked for; a tick box posts `'true'` or nothing (C13).
type _HiddenIsNeverAsked = Assert<
  Equals<Extract<keyof HiddenFieldVM, 'required' | 'autocomplete' | 'group' | 'options'>, never>
>
type _TickPostsTrue = Assert<Equals<CheckboxFieldVM['value'], 'true'>>

// A streamed part never enters a cached read: what the Partnership page knows of its visitor,
// the device's wishlist. The forms everyone needs stay in the cached part.
type _RequestTimeStreams = Assert<
  Equals<
    | Extract<keyof CachedPart<PartnershipVM>, 'access'>
    | Extract<keyof CachedPart<WishlistVM>, 'items'>,
    never
  >
>
// A post's result is resolved, never streamed: only a visitor without JavaScript gets one, and
// a streamed part stays hidden from them.
type _ResultIsNotStreamed = Assert<
  Equals<Extract<FormVM['result'] | PartnershipVM['result'], Streamed<unknown>>, never>
>
type _FormsAreCached = Assert<
  Equals<Extract<keyof CachedPart<PartnershipVM>, 'visitor'>, 'visitor'>
>

// C1 ⇄ C5: a brand's FX buffer is what an order's FxSnapshot records — a percent, as a decimal string.
type ConfigBuffer = NonNullable<MoneyConfig['fx']['bufferPct'][CurrencyCode]>
type _BufferIsC5s = Assert<Equals<ConfigBuffer, FxSnapshot['bufferPct']>>

// The purchase panel's impossible pairs do not compile; its possible ones do.
type Accepts<T, U extends T> = U
type NoActions = { primary: null; secondary: readonly [] }
type Fixed = { kind: 'fixed'; price: PriceVM }
type Buy = { action: 'buy'; line: LineIntent }
type _SoldHidden = Accepts<
  UniquePanelVM,
  { state: SoldVM; price: { kind: 'hidden' }; actions: NoActions }
>
type _PayForMyHold = Accepts<
  UniquePanelVM,
  {
    state: HeldForMeVM
    price: Fixed
    actions: { primary: { action: 'pay'; href: string }; secondary: readonly [] }
  }
>
type _SoldWithAPrice = Accepts<
  UniquePanelVM,
  // @ts-expect-error — a sold item shows no price
  { state: SoldVM; price: Fixed; actions: NoActions }
>
type _HeldByOtherRevealed = Accepts<
  UniquePanelVM,
  // @ts-expect-error — someone else's hold never shows this viewer a revealed price
  { state: HeldByOtherVM; price: { kind: 'revealed'; price: PriceVM }; actions: NoActions }
>
type _BuyBesideMyHold = Accepts<
  UniquePanelVM,
  // @ts-expect-error — Buy never sits beside the viewer's own hold: Pay leads
  { state: HeldForMeVM; price: Fixed; actions: { primary: Buy; secondary: readonly [] } }
>

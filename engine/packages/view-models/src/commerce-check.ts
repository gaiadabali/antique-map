/**
 * @contract C2 — type-level tests of the commerce view models · owner: ARC
 *
 * Compiled by `tsc` in `pnpm typecheck`, never run or exported. If a line here stops
 * compiling — or an `@ts-expect-error` stops being an error — the contract has drifted.
 *
 * The money rules for everything a view model hands a component to post back: no intent
 * carries a Money, or a field named for a figure only the server computes (C6
 * `IsServerPriced`, the same guard every C6 request passes); the totals a page shows never
 * carry the token that commits them. And the account's sections are exactly C10's.
 */
import type { AccountSection } from '@engine/config/routes'
import type { IsServerPriced } from '@engine/domain/api'

import type { CardVM } from './cards'
import type { LineIntent, Money } from './common'
import type { AppliedCodeVM, TotalsVM } from './commerce'
import type { AccountOfferVM, AccountSectionVM, AccountViewingVM } from './surfaces/account'
import type { CartCheckoutVM, CartLineVM } from './surfaces/cart'
import type { CheckoutVM } from './surfaces/checkout'
import type { GiftCardAmountVM } from './surfaces/gift-card'
import type { OrderPaymentVM } from './surfaces/order'
import type { PayVM, QuoteVM } from './surfaces/pay'
import type { PurchaseActionVM } from './surfaces/purchase'

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
  | NonNullable<PayVM['intents']>
  | NonNullable<QuoteVM['intents']>
  | Extract<OrderPaymentVM, { state: 'pending' }>['poll']
  | NonNullable<AccountOfferVM['respond']>
  | NonNullable<AccountViewingVM['cancel']>

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

// The account's sections are exactly C10's `ACCOUNT_SECTIONS`.
type _AccountSectionsAreC10s = Assert<Equals<AccountSectionVM['section'], AccountSection>>

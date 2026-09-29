/**
 * @contract C6 Commerce API — the bag and the ship-to market · owner: ARC · via `@engine/domain/api`
 *
 * A cart never reserves — only checkout does (COMMERCE.md §5). Every response is priced again on
 * the server for the ship-to market; a line that cannot be sold as it stands says why in
 * `problems` instead of vanishing. The bag is identified by its cookie or the customer's session,
 * never by an id in the body.
 */
import type { CountryCode, CurrencyCode } from '@engine/config/schema'

import type { Money, PriceSet } from '../money/contract'
import type {
  GiftCardDelivery,
  GiftWrapTarget,
  LineInput,
  ProductPublicId,
  VariantId,
} from './requests'
import type { LineProblem, PricedTotals } from './results'
import type { IsoDate } from './scalars'

/**
 * The market the ship-to country selects — the only input to currency, prices, price facets and
 * duties everywhere on the site (COMMERCE.md §2; ARCHITECTURE.md §9).
 */
export type MarketView = {
  readonly id: string
  readonly destination: CountryCode
  readonly currency: CurrencyCode
}

export type CartLineView = {
  readonly lineId: string
  readonly productId: ProductPublicId
  readonly variantId: VariantId | null
  readonly quantity: number
  /**
   * The most this line may hold: 1 for a unique item or an edition unit, what can be sold for
   * counted stock, `null` when nothing bounds it. More is `invalid` (`out-of-range`).
   */
  readonly maxQuantity: number | null
  readonly options: { readonly [axis: string]: string } | null
  readonly giftCard: GiftCardDelivery | null
  /** A gift-wrap line: the order or the line it wraps (EXPERIENCE-SHOP.md §7). Else null. */
  readonly wraps: GiftWrapTarget | null
  /** Null when the line cannot be priced for this market; `problems` says why. */
  readonly unitPrice: PriceSet | null
  /** `unitPrice × quantity`, before discounts, in the charge currency. */
  readonly subtotal: Money | null
  /** The seller of record that would sell this line here; null when none can. */
  readonly sellerId: string | null
  readonly problems: readonly LineProblem[]
}

/** One seller's share of the bag: the unit a checkout starts from. */
export type CartCheckoutGroup = {
  readonly sellerId: string
  readonly lineIds: readonly string[]
  readonly pricing: PricedTotals
}

export type AppliedCode = {
  readonly code: string
  readonly kind: 'discount' | 'gift-card'
  /** What it takes off (a discount) or pays (a gift card) at the current totals. */
  readonly value: Money
}

export type GiftOptions = {
  readonly note: string | null
  /** Suppress prices on the packing slip. */
  readonly hidePrices: boolean
}

export type CartView = {
  readonly market: MarketView
  readonly lines: readonly CartLineView[]
  /**
   * One per seller of record. A bag mixing Singapore and Jakarta stock shows two checkouts rather
   * than inventing a cross-entity order (COMMERCE.md §2).
   */
  readonly checkouts: readonly CartCheckoutGroup[]
  readonly codes: readonly AppliedCode[]
  readonly giftOptions: GiftOptions
  /** The market's free-shipping threshold (an automatic discount), when one applies. */
  readonly freeShipping: { readonly threshold: Money; readonly remaining: Money } | null
}

/** A read with nothing to send: the bag comes from the cookie or the session. */
export type EmptyRequest = Record<never, never>

export type CartAddLinesRequest = { readonly lines: readonly LineInput[] }
export type CartUpdateLineRequest = { readonly lineId: string; readonly quantity: number }
export type CartRemoveLineRequest = { readonly lineId: string }
/** A discount code or a gift-card code: the server tells them apart. */
export type CartApplyCodeRequest = { readonly code: string }
export type CartRemoveCodeRequest = { readonly code: string }
export type CartGiftOptionsRequest = GiftOptions

/**
 * The ship-to selector. Sets the one `shipTo` cookie and re-prices the bag; moving into
 * Indonesia re-prices to IDR with a visible notice (`repriced`).
 */
export type ShipToRequest = { readonly country: CountryCode }
export type ShipToResult = { readonly market: MarketView; readonly cart: CartView | null }

export type GiftCardBalanceRequest = { readonly code: string }
export type GiftCardBalanceView = { readonly balance: Money; readonly expiresOn: IsoDate | null }

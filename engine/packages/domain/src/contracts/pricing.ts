/**
 * @contract C5 Money — the pricing pipeline · owner: ARC · re-exported from `@engine/domain/money`
 *
 * The step signature every pricing stage implements and the figures a run stores (COMMERCE.md §3,
 * "The pricing pipeline"). Each stage is a pure function — no I/O, no clock, no randomness;
 * what it needs arrives as its `input` and the `PricingContext` — with its own tests. The types
 * thread each stage's output into the next, so a stage cannot be handed a state that skipped the
 * stages before it: the tax step cannot see lines whose order discount is not yet allocated.
 *
 * Every figure is in the charge currency (`PipelineState.currency`); a display estimate in another
 * currency is a `PriceSet` concern, built after the run and never fed back into it.
 */
import type { CountryCode, CurrencyCode, MarketConfig, SellerConfig } from '@engine/config/schema'

import type { FxSnapshot, Money, RoundingRecord } from '../money/contract'
import type { PriceAgreementRef, TradeTerms, UnitPriceSource } from './price-sources'
import type { DecimalString, ExactRatio } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

/** The stages, in the order they run. */
export type PipelineOrder = readonly [
  'unit-price', //          market list: explicit | product-type table × multiplier | derived
  'customer-price-list', // an approved retailer's trade tier on its quote (D32); else the list
  'line-discounts', //      bundles, multi-buy ("3 for 2")
  'order-discounts', //     codes, first-order offer, automatic rules (the free-shipping threshold)
  'shipping', //            the chosen rate or quote (COMMERCE.md §8)
  'tax', //                 per seller regime and destination (COMMERCE.md §9)
  'gift-card', //           applied last, never below zero
  'grand-total', //         what is charged
]
export type PipelineStage = PipelineOrder[number]

/**
 * A line before any stage has run: what is bought and how many — never a price. The unit-price
 * stage prices it from server-side price lists, or from the stored AgreedPrice its `agreement`
 * names; nothing a client sent is ever a figure here.
 */
export type PipelineLineInput = {
  readonly lineId: string
  /** The product's public id and, for variant merchandise, the variant's id. */
  readonly productId: number
  readonly variantId: number | null
  /** A positive safe integer; always 1 for a unique item. */
  readonly quantity: number
  /** Set by the server for a line paid through a pay link or a quote; null for a bag's line. */
  readonly agreement: PriceAgreementRef | null
}

type NoFigures = Record<never, never>

/** The per-line figures each stage adds. Every one is stored on the order line. */
export type LineFiguresAdded = {
  readonly 'unit-price': {
    /**
     * From the market list — rounded at `market-unit-price` only when `derived` — or, for `offer`
     * and `quote`, the stored AgreedPrice as it is, rounded nowhere again.
     */
    readonly unitPrice: Money
    readonly unitPriceSource: UnitPriceSource
    /** `unitPrice × quantity` — integer times integer, nothing to round. */
    readonly subtotal: Money
  }
  /**
   * The price this buyer pays before discounts. Everyone pays the list (`unitPrice`) except an
   * approved retailer on its quote, who pays its trade tier's: `unitPrice` less `discountBps`,
   * rounded half-even once at `trade-unit-price`. A line an agreement prices takes the tier the
   * agreement recorded; any other line takes `PricingContext.trade`.
   */
  readonly 'customer-price-list': {
    readonly tradeTierId: string | null
    readonly buyerUnitPrice: Money
    /** `buyerUnitPrice × quantity` — integer times integer, nothing to round. */
    readonly buyerSubtotal: Money
  }
  readonly 'line-discounts': {
    /** Rounded half-even at `line-discount`; never more than `buyerSubtotal`. */
    readonly lineDiscount: Money
    readonly lineDiscountIds: readonly string[]
  }
  /** This line's share of the order discount, allocated by largest remainder. */
  readonly 'order-discounts': { readonly orderDiscount: Money }
  readonly shipping: NoFigures
  /** Rounded half-even at `tax-per-line`; zero when zero-rated or when the seller charges no tax. */
  readonly tax: { readonly tax: Money }
  readonly 'gift-card': NoFigures
  readonly 'grand-total': NoFigures
}

/** The order-level figures each stage adds. Every one is stored on the order. */
export type OrderFiguresAdded = {
  readonly 'unit-price': { readonly subtotal: Money }
  /** The lines' sum: what C6's `PricedTotals.subtotal` shows the buyer. */
  readonly 'customer-price-list': { readonly buyerSubtotal: Money }
  readonly 'line-discounts': { readonly lineDiscount: Money }
  readonly 'order-discounts': {
    readonly orderDiscount: Money
    readonly discountIds: readonly string[]
    /** Set by a free-shipping code or the free-shipping threshold; applied by the shipping stage. */
    readonly freeShipping: boolean
  }
  readonly shipping: {
    readonly shipping: Money
    /** The shipping waived by `freeShipping` — equal to `shipping` when it applies, else zero. */
    readonly shippingDiscount: Money
  }
  readonly tax: {
    /** The sum of `taxLines` — never a separately rounded order figure. */
    readonly tax: Money
    readonly taxLines: readonly TaxLine[]
  }
  readonly 'gift-card': {
    /** Deducted after tax, never taking the total below zero (COMMERCE.md §10). */
    readonly giftCard: Money
    readonly giftCardIds: readonly string[]
  }
  readonly 'grand-total': { readonly grandTotal: Money }
}

/**
 * One tax line: the order stores rate, base and amount per line (COMMERCE.md §9). `base` stays an
 * exact ratio — ID-PPN taxes 11/12 of the price, a fraction; only `amount` is rounded.
 */
export type TaxLine = {
  /** An order line id, or `shipping`. */
  readonly subject: string
  /** The effective-dated tax rule applied (tax rules are data, because they change). */
  readonly ruleId: string
  readonly rate: DecimalString
  readonly base: ExactRatio
  readonly amount: Money
  /** Exports are zero-rated (SG-GST with evidence); `amount` is then zero. */
  readonly zeroRated: boolean
}

/** Folds the figures of every stage up to and including `S`, in pipeline order. */
type FiguresThrough<M, S, Order = PipelineOrder, Acc = unknown> = Order extends readonly [
  infer Head extends keyof M,
  ...infer Rest,
]
  ? Head extends S
    ? Acc & M[Head]
    : FiguresThrough<M, S, Rest, Acc & M[Head]>
  : Acc

/** The stage that runs immediately before `S`; `'start'` before the first. */
export type StageBefore<
  S extends PipelineStage,
  Order = PipelineOrder,
  Previous = 'start',
> = Order extends readonly [infer Head, ...infer Rest]
  ? Head extends S
    ? Previous
    : StageBefore<S, Rest, Head>
  : never

type Reached = PipelineStage | 'start'

export type PipelineLine<S extends Reached> = PipelineLineInput &
  (S extends PipelineStage ? FiguresThrough<LineFiguresAdded, S> : unknown)

/** The pipeline after stage `S` has run — or, for `'start'`, before any has. */
export type PipelineState<S extends Reached> = {
  readonly stage: S
  /** The charge currency: every Money in this state is in it. */
  readonly currency: CurrencyCode
  readonly lines: readonly PipelineLine<S>[]
  /** Every rounding so far, in the order it happened; a stage that rounds appends its records. */
  readonly roundings: readonly RoundingRecord[]
} & (S extends PipelineStage ? FiguresThrough<OrderFiguresAdded, S> : unknown)

type PricingContextBase = {
  readonly seller: SellerConfig
  readonly market: MarketConfig
  readonly destination: CountryCode
  readonly chargeCurrency: CurrencyCode
  /** Whether this market's price list includes tax (COMMERCE.md §9). */
  readonly taxIncluded: boolean
  /** Present when a derived price or a conversion is involved; stored on the order. */
  readonly fx: FxSnapshot | null
  readonly at: Date
}

/**
 * Everything a stage may read besides its own input — loaded before the run, never fetched
 * during it. `at` is the pricing instant (discount windows, effective-dated tax rules), passed in
 * so a stage never reads a clock. `channel` says who is being priced:
 * - `bag` — a cart and its checkout: lines no agreement prices, and never trade terms (D31:
 *   shoppers buy as guests, and a retailer has no wholesale cart);
 * - `quote` — the order builder pricing a quote or an order for a named customer, or the payment of
 *   an agreement (a pay link, an accepted quote): `trade` only when that customer is an approved
 *   retailer, resolved on the server (`TradeTermsResolution` `terms`; any other answer is null);
 *   a line an agreement prices keeps the tier it recorded.
 */
export type PricingContext =
  | (PricingContextBase & { readonly channel: 'bag'; readonly trade: null })
  | (PricingContextBase & { readonly channel: 'quote'; readonly trade: TradeTerms | null })

/**
 * The signature of stage `S`: the state the previous stage produced, the stage's own input (its
 * discount rules, the chosen rate, the tax rules, the applied gift cards — DOM defines each), and
 * the context; out comes the state after `S`. Pure: the same arguments always give the same state.
 */
export type PricingStep<S extends PipelineStage, Input = void> = (
  state: PipelineState<StageBefore<S>>,
  input: Input,
  context: PricingContext,
) => PipelineState<S>

/** What an order stores (design.md `Order.totals`): every stage's figures and every rounding. */
export type PipelineTotals = PipelineState<'grand-total'>

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type TaxInput = Parameters<PricingStep<'tax'>>[0]
type _TaxRunsAfterShipping = Assert<Equals<TaxInput, PipelineState<'shipping'>>>
type _FirstStageStartsBare = Assert<
  Equals<Parameters<PricingStep<'unit-price'>>[0], PipelineState<'start'>>
>
// @ts-expect-error — the tax step cannot take lines whose order discount is not yet allocated
type _TaxBeforeOrderDiscounts = Accepts<TaxInput, PipelineState<'line-discounts'>>
type _StartLinesCarryNoFigure = Assert<
  Equals<Extract<keyof PipelineLine<'start'>, keyof LineFiguresAdded['unit-price']>, never>
>
// @ts-expect-error — a line entering the pipeline has no price to read: the server prices it
type _PriceBeforeUnitPrice = PipelineLine<'start'>['unitPrice']
type Base = Omit<PricingContext, 'channel' | 'trade'>
type _RetailersQuoteAtTrade = Accepts<
  PricingContext,
  Base & { channel: 'quote'; trade: TradeTerms }
>
type _BagAtTrade = Accepts<
  PricingContext,
  // @ts-expect-error — a bag is never priced at a trade tier: shoppers buy as guests (D31)
  Base & { channel: 'bag'; trade: TradeTerms }
>
type _TotalsKeepEveryFigure = Assert<
  Equals<
    Exclude<keyof PipelineTotals, 'stage' | 'currency' | 'lines' | 'roundings'>,
    | 'subtotal'
    | 'buyerSubtotal'
    | 'lineDiscount'
    | 'orderDiscount'
    | 'discountIds'
    | 'freeShipping'
    | 'shipping'
    | 'shippingDiscount'
    | 'tax'
    | 'taxLines'
    | 'giftCard'
    | 'giftCardIds'
    | 'grandTotal'
  >
>

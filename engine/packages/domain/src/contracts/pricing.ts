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

import type { FxSnapshot, Money, RoundingRecord, RoundingRecordAt } from '../money/contract'
import type { DecimalString, ExactRatio, IsoInstant } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

/** The stages, in the order they run. */
export type PipelineOrder = readonly [
  'unit-price', //          market list: explicit | product-type table × multiplier | derived
  'customer-price-list', // trade and wholesale tiers (v2); the identity in v1
  'line-discounts', //      bundles, multi-buy ("3 for 2")
  'order-discounts', //     codes, first-order offer, automatic rules (the free-shipping threshold)
  'shipping', //            the chosen rate or quote (COMMERCE.md §8)
  'tax', //                 per seller regime and destination (COMMERCE.md §9)
  'gift-card', //           applied last, never below zero
  'grand-total', //         what is charged
]
export type PipelineStage = PipelineOrder[number]

/**
 * Where a line's unit price came from (COMMERCE.md §3, market price lists) — stored with it. The
 * market lists price a bag; `offer` and `quote` price what was agreed: an accepted offer's figure,
 * or an issued quote's or proforma's line, looked up on the server by the agreement the line names.
 */
export type UnitPriceSource = 'explicit' | 'product-type-table' | 'derived' | 'offer' | 'quote'

/**
 * Which agreement prices a line. The server sets it from the pay link or quote a buyer holds —
 * never from a request — and the unit-price stage then reads the stored AgreedPrice, not a list.
 */
export type PriceAgreementRef =
  | { readonly kind: 'offer'; readonly offerId: number }
  | { readonly kind: 'quote'; readonly quoteId: number; readonly quoteLineId: string }

/**
 * An agreed unit price, stored server-side when the offer is accepted or the quote issued. A bid
 * or a counter arrives in the buyer's market currency, so the figure is converted ONCE, then, into
 * the charge currency at the `fx-conversion` point, with the snapshot and the rounding it used;
 * the pay link or the proforma charges exactly `unitPrice` however the rate moves afterwards. It
 * reads like a price on the market's list: tax-inclusive where that list is.
 */
export type AgreedPrice = {
  readonly ref: PriceAgreementRef
  /** In the charge currency: what the pipeline's unit-price stage uses. */
  readonly unitPrice: Money
  /** The figure as agreed — the proposal, the counter or the quote line — in its own currency. */
  readonly agreed: Money
  /** Null when the agreed currency is the charge currency and nothing was converted. */
  readonly fx: FxSnapshot | null
  readonly rounding: RoundingRecordAt<'fx-conversion'> | null
  readonly agreedAt: IsoInstant
}

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
  readonly 'customer-price-list': { readonly priceListId: string | null }
  readonly 'line-discounts': {
    /** Rounded half-even at `line-discount`; never more than `subtotal`. */
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
  readonly 'customer-price-list': NoFigures
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

/**
 * Everything a stage may read besides its own input — loaded before the run, never fetched
 * during it. `at` is the pricing instant (discount windows, effective-dated tax rules), passed in
 * so a stage never reads a clock.
 */
export type PricingContext = {
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
// An agreement names the offer or quote; the figure is looked up, so none can ride along.
type AgreementKeys = PriceAgreementRef extends infer R
  ? R extends unknown
    ? keyof R
    : never
  : never
type _AgreementCarriesNoFigure = Assert<
  Equals<Extract<AgreementKeys, 'unitPrice' | 'agreed' | 'amount' | 'price'>, never>
>
type _TotalsKeepEveryFigure = Assert<
  Equals<
    Exclude<keyof PipelineTotals, 'stage' | 'currency' | 'lines' | 'roundings'>,
    | 'subtotal'
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

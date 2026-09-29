/**
 * @contract C5 Money · owner: ARC · entry `@engine/domain/money`
 *
 * `Money`, `PriceSet`, the FX snapshot and the named rounding points (COMMERCE.md §3,
 * CONVENTIONS.md §3), plus the pricing pipeline's step signature and stored figures, re-exported
 * from `../contracts/pricing`. DOM implements the arithmetic, guards and rounding functions
 * against these types (TASKS.md 17.2); PAY, WEB, the view models and the apps consume them.
 * Changing this file is a versioned change announced to every consuming lane (CONTRACTS.md).
 *
 * Type-level only. view-models imports this module with `import type` and declares no runtime
 * dependency, so nothing exported here may become a value. Runtime money facts live in config:
 * the currency exponents are `CURRENCY_EXPONENT` in `@engine/config/schema`, never repeated here.
 */
import type { CurrencyCode, MoneyConfig, moneySchema } from '@engine/config/schema'

import type { DecimalString, ExactRatio, IsoInstant } from '../contracts/scalars'
import type {
  Accepts,
  Assert,
  Equals,
  IsReadonly,
  MutuallyAssignable,
} from '../contracts/type-assertions'

export type { DecimalString, ExactRatio } from '../contracts/scalars'
export type {
  AgreedPrice,
  AgreedTradeTier,
  PriceAgreementRef,
  TradeMinimum,
  TradeMinimumShortfall,
  TradeMinimumWaiver,
  TradeTerms,
  TradeTermsResolution,
  UnitPriceSource,
} from '../contracts/price-sources'
export type {
  LineFiguresAdded,
  OrderFiguresAdded,
  PipelineLine,
  PipelineLineInput,
  PipelineOrder,
  PipelineStage,
  PipelineState,
  PipelineTotals,
  PricingContext,
  PricingStep,
  StageBefore,
  TaxLine,
} from '../contracts/pricing'

// ─── Money ───────────────────────────────────────────────────────────────────────────────────

/**
 * An amount of one currency, in integer minor units.
 *
 * - `amount` is a SAFE integer: `Number.isSafeInteger(amount)` is asserted at every boundary —
 *   request parsing, Postgres `bigint` reads (through a guard, never as a string), provider
 *   payloads. Never a float, never a string, never a BigInt across the wire. Stored as `bigint`
 *   with `CHECK (amount BETWEEN 0 AND MONEY_AMOUNT_MAX)` and read with drizzle's
 *   `bigint({ mode: 'number' })` (../contracts/storage.ts, for SCH).
 * - Minor units follow `CURRENCY_EXPONENT` (C1) — the engine's exponents, not ISO 4217's
 *   everywhere: IDR is 0 here (Rp 95.000 is `95000`) though ISO lists 2, while USD, SGD, EUR,
 *   AUD and GBP are 2 as in ISO (USD 10.00 is `1000`). Read the exponent; never assume 100. A
 *   provider that counts in other units (IDR in hundredths) is converted by its C7 adapter, both
 *   ways, at its own boundary — never in the domain, never twice.
 * - `amount` is never negative. A deduction — a discount, a refund, a gift-card application — is
 *   a non-negative amount in a field named for the deduction, so a sign is never lost or doubled.
 * - Arithmetic only within one `currency`. Changing currency is an FX conversion, rounded at the
 *   `fx-conversion` point — never a relabel.
 *
 * The fields are readonly: `price.amount *= 1.1` — a float, rounded at no named point — does not
 * compile. TypeScript ignores `readonly` in assignability, so config's `moneySchema` output is a
 * Money and a Money satisfies `moneySchema` (asserted at the foot of this file). `C` narrows the
 * currency where a rule fixes it; it defaults to every CurrencyCode.
 */
export type Money<C extends CurrencyCode = CurrencyCode> = {
  readonly amount: number
  readonly currency: C
}

// ─── PriceSet ────────────────────────────────────────────────────────────────────────────────

type PriceBase = {
  /** What the buyer is charged, in the charge currency — the only figure a total is built from. */
  readonly charge: Money
  /** Whether `charge` includes tax: each market's price list declares it (COMMERCE.md §9). */
  readonly taxIncluded: boolean
}

/**
 * One price as one buyer sees it, in their market (COMMERCE.md §3) — what an item page, a tile,
 * a bag line or a sister link displays.
 *
 * `estimate` is display-only: never charged, never summed into a total, never sent back by a
 * client, never an input to the pricing pipeline. `basis` says why it is or is not present:
 * - `sole-currency` — the market allows no amount beside the charge. Delivering in Indonesia
 *   shows IDR alone on every surface (the rupiah rule, COMPLIANCE.md §1); there is no field an
 *   estimate could be put in.
 * - `market-currency` — the charge is already in the market's currency.
 * - `converted` — the seller charges in another currency, and `estimate` is the charge converted
 *   into the market's currency: "≈ €1,020 — charged in USD 1,100".
 *
 * An estimate claims no more precision than a day's rate supports: it is converted at the
 * `fx-conversion` point half-even to a WHOLE major unit of its currency (`amount` a multiple of
 * 10^exponent), and shown without fraction digits after "≈". The charge is exact to the minor unit.
 *
 * Display (`formatMoney`, `@engine/i18n`, TASKS.md 3.1.b) fixes the fraction digits itself —
 * `CURRENCY_EXPONENT[currency]` for an amount, none for an estimate — and never takes the
 * runtime's ICU default for the currency, which differs between runtimes (some browsers give IDR
 * two). Symbols and spacing still differ between ICUs, so formatting is the server's: a Client
 * Component shows the server's string (CONVENTIONS.md §6). A component never formats, rounds or
 * sums a Money itself.
 */
export type PriceSet =
  | (PriceBase & { readonly basis: 'sole-currency'; readonly estimate: null })
  | (PriceBase & { readonly basis: 'market-currency'; readonly estimate: null })
  | (PriceBase & { readonly basis: 'converted'; readonly estimate: Money })

// ─── FX ──────────────────────────────────────────────────────────────────────────────────────

/**
 * The rate an order, a derived price or an estimate used. Every order stores the one it used
 * (COMMERCE.md §3) so a document reproduces to the minor unit. One major unit of `from` is `rate`
 * major units of `to`, exactly as the source published it. `bufferPct` is the market's FX buffer
 * folded into derived prices, in PERCENT as C1's `money.fx.bufferPct` states it — `'3.5'` is 3.5 %,
 * never a fraction and never a float — and `'0'` where none applies (an estimate, a refund).
 */
export type FxSnapshot = {
  readonly from: CurrencyCode
  readonly to: CurrencyCode
  readonly rate: DecimalString
  readonly bufferPct: DecimalString
  /** The rate source's id, as configured (DEPLOYMENT.md §5 refreshes it daily). */
  readonly source: string
  readonly asOf: IsoInstant
}

// ─── Named rounding points ───────────────────────────────────────────────────────────────────

/**
 * The only places a fraction of a minor unit becomes an integer, each with its one method
 * (COMMERCE.md §3). A figure rounded anywhere else, or rounded again at a point not named for it,
 * is a reconciliation bug.
 *
 * - `market-unit-price` — a derived market price, up to the market's clean price point
 *   (Rp 95.000, Rp 1.450.000; USD 10 for originals). The ladder is brand config — C1
 *   `money.rounding[currency]`, bands of `{ upTo, step }`: a price up to `upTo` rounds UP to a
 *   multiple of `step`, never down, so a converted price never undercuts its base.
 * - `trade-unit-price` — an approved retailer's trade price, `unitPrice` less the tier's
 *   `discountBps`, half-even to the minor unit, once per line (D32); a trade line is that unit
 *   price times its quantity, and a quote paid later applies the tier it recorded, not a new one.
 * - `line-discount` — half-even to the minor unit.
 * - `order-discount-allocation` — largest remainder, so the lines sum to the order figure exactly.
 * - `tax-per-line` — half-even on the line's tax base; an order's tax is the sum of its lines.
 * - `fx-conversion` — half-even: to the minor unit for a figure that is charged, to a whole
 *   major unit for a display estimate (`PriceSet.estimate`, never stored). Where the result is a
 *   market unit price, `market-unit-price` follows it: the one sanctioned sequence of two
 *   roundings, and both are recorded.
 * - `partial-refund-allocation` — largest remainder across the refunded lines.
 */
export type RoundingMethodAt = {
  readonly 'market-unit-price': 'up-to-price-point'
  readonly 'trade-unit-price': 'half-even'
  readonly 'line-discount': 'half-even'
  readonly 'order-discount-allocation': 'largest-remainder'
  readonly 'tax-per-line': 'half-even'
  readonly 'fx-conversion': 'half-even'
  readonly 'partial-refund-allocation': 'largest-remainder'
}

export type RoundingPoint = keyof RoundingMethodAt
export type RoundingMethod = RoundingMethodAt[RoundingPoint]

/** The points that split a whole across parts. */
export type AllocationPoint = {
  [P in RoundingPoint]: RoundingMethodAt[P] extends 'largest-remainder' ? P : never
}[RoundingPoint]

/**
 * One rounding at point `P`, stored beside the figure it produced. `exact` is the unrounded value
 * in minor units as an integer ratio; `subject` names what was rounded (a line id, `order`,
 * `shipping`, a refund line). An allocation stores one record per part together with the `whole`
 * it split, and the parts' `rounded` amounts sum to `whole` exactly.
 */
export type RoundingRecordAt<P extends RoundingPoint> = {
  readonly point: P
  readonly method: RoundingMethodAt[P]
  readonly subject: string
  readonly exact: ExactRatio
  readonly rounded: Money
} & (P extends AllocationPoint ? { readonly whole: Money } : unknown)

/** Any stored rounding — the union over every named point. */
export type RoundingRecord = { [P in RoundingPoint]: RoundingRecordAt<P> }[RoundingPoint]

// ─── Type-level tests (compile-time only; `pnpm typecheck` runs them) ────────────────────────

/** zod 4's inferred output of a schema, read without importing zod (`z.infer` is this lookup). */
type SchemaOutput<S> = S extends { readonly _zod: { readonly output: infer O } } ? O : never

// C1 ⇄ C5: config's `moneySchema` parses exactly a Money, in both directions.
type _MoneyMatchesConfigSchema = Assert<MutuallyAssignable<Money, SchemaOutput<typeof moneySchema>>>
// C1 ⇄ C5: the FX buffer a snapshot records is exactly the type C1 validates — a percent as text.
type ConfigBuffer = NonNullable<MoneyConfig['fx']['bufferPct'][CurrencyCode]>
type _BufferMatchesConfig = Assert<Equals<FxSnapshot['bufferPct'], ConfigBuffer>>
type _MoneyIsReadonly = Assert<IsReadonly<Money, 'amount'>>
type _AllocationPoints = Assert<
  MutuallyAssignable<AllocationPoint, 'order-discount-allocation' | 'partial-refund-allocation'>
>

type _ConvertedPrice = Accepts<
  PriceSet,
  { basis: 'converted'; charge: Money; taxIncluded: true; estimate: Money }
>
type _SoleCurrencyWithEstimate = Accepts<
  PriceSet,
  // @ts-expect-error — under the rupiah rule there is no estimate to fill
  { basis: 'sole-currency'; charge: Money; taxIncluded: true; estimate: Money }
>
type _ConvertedWithoutEstimate = Accepts<
  PriceSet,
  // @ts-expect-error — a converted price always carries its estimate
  { basis: 'converted'; charge: Money; taxIncluded: true; estimate: null }
>

type TaxRecord = { subject: 'line-1'; exact: '1375/12'; rounded: Money; point: 'tax-per-line' }
type _TaxRoundsHalfEven = Accepts<RoundingRecord, TaxRecord & { method: 'half-even' }>
// @ts-expect-error — tax per line rounds half-even, never up to a price point
type _TaxUpToPricePoint = Accepts<RoundingRecord, TaxRecord & { method: 'up-to-price-point' }>
type AllocationRecord = { subject: 'line-1'; exact: '100/3'; rounded: Money }
type _AllocationWithoutWhole = Accepts<
  RoundingRecord,
  // @ts-expect-error — an allocation records the whole it split, so its parts can be summed back
  AllocationRecord & { point: 'order-discount-allocation'; method: 'largest-remainder' }
>

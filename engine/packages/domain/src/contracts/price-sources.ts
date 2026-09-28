/**
 * @contract C5 Money — where a unit price comes from · owner: ARC · re-exported from `@engine/domain/money`
 *
 * The sources the pipeline's first two stages price a line from (COMMERCE.md §3): a market list;
 * an agreement the buyer already holds — an accepted offer, an issued quote; and, for an approved
 * retail partner's quote only, a trade tier (D31, D32). Split from the pipeline's mechanics
 * (./pricing.ts) so that each file answers one question.
 */
import type { FxSnapshot, Money, RoundingRecordAt } from '../money/contract'
import type { IsoInstant } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

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

/** The trade tier a retailer's quote was issued at, kept on each of its lines. */
export type AgreedTradeTier = { readonly tierId: string; readonly discountBps: number }

/**
 * An agreed unit price, stored server-side when the offer is accepted or the quote issued. A bid
 * or a counter arrives in the buyer's market currency, so the figure is converted ONCE, then, into
 * the charge currency at the `fx-conversion` point, with the snapshot and the rounding it used;
 * the pay link or the proforma charges exactly what was agreed however the rate moves afterwards.
 * It reads like a price on the market's list: tax-inclusive where that list is.
 */
export type AgreedPrice = {
  readonly ref: PriceAgreementRef
  /** In the charge currency, before any trade tier: what the pipeline's unit-price stage uses. */
  readonly unitPrice: Money
  /** The figure as agreed — the proposal, the counter or the quote line — in its own currency. */
  readonly agreed: Money
  /** Null when the agreed currency is the charge currency and nothing was converted. */
  readonly fx: FxSnapshot | null
  readonly rounding: RoundingRecordAt<'fx-conversion'> | null
  /**
   * A retailer's quote only: the tier it was issued at, which the customer-price-list stage applies
   * again when the quote is paid — the tier in force at issue, never the one in force at payment —
   * so the order reproduces the quote to the minor unit. Null for every other agreement.
   */
  readonly trade: AgreedTradeTier | null
  readonly agreedAt: IsoInstant
}

// ─── Trade terms (D31, D32) ──────────────────────────────────────────────────────────────────

/**
 * A retail partner's trade terms: a price tier and a minimum order, as data. Brand config's
 * `commerce.trade` (C1) declares the tiers and the default one, a CMS global may override them (the
 * config spine, BRANDS.md §3), and staff assign each approved retailer a tier — the default, at
 * approval. The server resolves them for an APPROVED retailer only, and only to price that
 * retailer's quote in the order builder (TASKS.md 24.5): a bag never carries them (`PricingContext`
 * `channel: 'bag'`), an applicant who is pending, declined or revoked never gets them, and nothing
 * a client sends ever names a tier.
 */
export type TradeTerms = {
  readonly tierId: string
  /**
   * Off the market list's unit price, in basis points (4000 is 40 % off). The trade unit price is
   * `unitPrice × (10000 − discountBps) / 10000`, rounded half-even to the minor unit once, at
   * `trade-unit-price`; a line at trade is that clean unit price times its quantity.
   */
  readonly discountBps: number
  readonly minimum: TradeMinimum
}

/**
 * The least a retailer's quote must come to — one rule per tier, as the programme states it (C2's
 * `MinimumOrderVM` shows the same two kinds). Checked when the quote is ISSUED: the order builder
 * issues it only if it meets the minimum of the terms in force at that moment, or if staff waive
 * the minimum for that one quote within their role's limit, the waiver recorded on it. Acceptance
 * does not check again: the retailer accepts the quote as issued, its lines cannot change, and it
 * keeps the terms it was issued under.
 */
export type TradeMinimum =
  /**
   * Goods at the prices paid — after the tier and every discount, before shipping and tax — in the
   * currency the seller quotes its retailers in (an Indonesian PT: IDR).
   */
  | { readonly kind: 'amount'; readonly amount: Money }
  /**
   * Pieces of each design (CONTENT-MODEL.md §2) — "20 per design". `mixedSizes`: the sizes and
   * formats of one design count together; otherwise each variant must reach `pieces` on its own.
   */
  | { readonly kind: 'piecesPerDesign'; readonly pieces: number; readonly mixedSizes: boolean }

/** Why a retailer's quote cannot be issued yet, as the order builder shows it to staff. */
export type TradeMinimumShortfall =
  | { readonly kind: 'amount'; readonly total: Money; readonly required: Money }
  | {
      readonly kind: 'piecesPerDesign'
      readonly short: readonly {
        readonly designId: number
        readonly variantId: number | null
        readonly pieces: number
        readonly required: number
      }[]
    }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// An agreement names the offer or quote; the figure is looked up, so none can ride along.
type AgreementKeys = PriceAgreementRef extends infer R
  ? R extends unknown
    ? keyof R
    : never
  : never
type _AgreementCarriesNoFigure = Assert<
  Equals<Extract<AgreementKeys, 'unitPrice' | 'agreed' | 'amount' | 'price'>, never>
>
// A shortfall answers the minimum it failed, kind for kind.
type _ShortfallPerMinimum = Assert<Equals<TradeMinimumShortfall['kind'], TradeMinimum['kind']>>
type _OneRulePerTier = Accepts<
  TradeMinimum,
  // @ts-expect-error — a pieces minimum names its count; it is not an amount
  { kind: 'piecesPerDesign'; amount: Money }
>

/**
 * @contract C1 — brand config: money and markets · owner: ARC · entry: `@engine/config/schema`
 *
 * Currency follows the destination (COMMERCE.md §3): a market is a destination group and
 * its currency, and the ship-to selector picks one. Rounding here is only the first named
 * rounding point — `market-unit-price` of a derived price (C5 `RoundingMethodAt`); the
 * others are C5's and take no configuration.
 */
import { z } from 'zod'

import {
  currencyCodeSchema,
  destinationSchema,
  idSchema,
  isLadder,
  LADDER_MESSAGE,
} from './primitives'

export const marketSchema = z.strictObject({
  id: idSchema,
  /** `*` catches every destination no other market lists. */
  destinations: z.array(destinationSchema).min(1),
  currency: currencyCodeSchema,
  /** Whether this market's price list includes tax — C5 `PriceSet.taxIncluded` reads it. */
  pricesIncludeTax: z.boolean().default(true),
})
export type MarketConfig = z.infer<typeof marketSchema>

/**
 * One band of a currency's price-point ladder. Ladders apply to DERIVED prices only — base
 * price → daily FX → buffer → round (COMMERCE.md §3); an explicit or product-type-table
 * price is entered at its price point and never rounded. A derived price up to `upTo` rounds
 * UP to a multiple of `step` — always up (C5 `up-to-price-point`), so it never undercuts the
 * base. Minor units, with bands close enough that a step never adds more than a tenth
 * (`validateBrandConfigs()` bounds it): IDR `[{ upTo: 100000, step: 5000 }, { upTo: 1000000,
 * step: 10000 }, { upTo: 10000000, step: 50000 }, { upTo: null, step: 100000 }]` gives
 * Rp 95.000 and Rp 1.450.000; USD `[{ upTo: null, step: 1000 }]` is USD 10.00.
 */
const PERCENT = /^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/
/** `"0"`–`"20"`, at most two decimals — C5's `DecimalString`. */
const percentSchema = z
  .templateLiteral([z.number()])
  .refine((v) => PERCENT.test(v) && Number(v) <= 20, 'a percentage from "0" to "20", e.g. "3.5"')

export const priceBandSchema = z.strictObject({
  upTo: z.int().positive().nullable(),
  step: z.int().positive(),
})
export type PriceBand = z.infer<typeof priceBandSchema>
export const priceLadderSchema = z.array(priceBandSchema).min(1).refine(isLadder, LADDER_MESSAGE)
export type PriceLadder = z.infer<typeof priceLadderSchema>

export const moneyConfigSchema = z.strictObject({
  /** Prices are entered in this currency; tiers and thresholds are read in it. */
  base: currencyCodeSchema,
  markets: z.array(marketSchema).min(1),
  /** One ladder per market currency (checked by `validateBrandConfigs()`). */
  rounding: z.partialRecord(currencyCodeSchema, priceLadderSchema),
  fx: z.strictObject({
    source: z.enum(['ecb-reference', 'manual']),
    /**
     * Added to the daily rate before rounding, per target currency: a PERCENT as an exact
     * decimal string (`"3"`, `"3.5"`), never a float — C5's `FxSnapshot.bufferPct` records it
     * as given, so a document reproduces to the minor unit.
     */
    bufferPct: z.partialRecord(currencyCodeSchema, percentSchema),
  }),
})
export type MoneyConfig = z.infer<typeof moneyConfigSchema>

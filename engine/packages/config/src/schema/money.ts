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
 * One band of a currency's price-point ladder: a derived price up to `upTo` rounds UP to a
 * multiple of `step` — always up (C5 `up-to-price-point`), so a converted price never
 * undercuts the base. Minor units: IDR `{ upTo: 100000, step: 5000 }` gives Rp 95.000 and a
 * next band `{ upTo: null, step: 50000 }` gives Rp 1.450.000 (COMMERCE.md §3); USD
 * `{ upTo: null, step: 1000 }` is USD 10.00.
 */
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
    /** Added to the daily rate before rounding, per target currency (3–5%). */
    bufferPct: z.partialRecord(currencyCodeSchema, z.number().min(0).max(20)),
  }),
})
export type MoneyConfig = z.infer<typeof moneyConfigSchema>

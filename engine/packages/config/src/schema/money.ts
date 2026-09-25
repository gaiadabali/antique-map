/**
 * @contract C1 — brand config: money and markets · owner: ARC · entry: `@engine/config/schema`
 *
 * Currency follows the destination (COMMERCE.md §3): a market is a destination group and
 * its currency, and the ship-to selector picks one. Rounding here is only the first named
 * rounding point — the market price point of a derived price; the others are C5's.
 */
import { z } from 'zod'

import { currencyCodeSchema, destinationSchema, idSchema } from './primitives'

export const marketSchema = z.strictObject({
  id: idSchema,
  /** `*` catches every destination no other market lists. */
  destinations: z.array(destinationSchema).min(1),
  currency: currencyCodeSchema,
  pricesIncludeTax: z.boolean().default(true),
})
export type MarketConfig = z.infer<typeof marketSchema>

/**
 * A derived price rounds to a multiple of `step` minor units — IDR 50000 is Rp 50.000,
 * USD 1000 is USD 10.00 — `up` by default, so a converted price never undercuts the base.
 */
export const roundingRuleSchema = z.strictObject({
  step: z.int().positive(),
  mode: z.enum(['up', 'half-even']).default('up'),
})
export type RoundingRule = z.infer<typeof roundingRuleSchema>

export const moneyConfigSchema = z.strictObject({
  /** Prices are entered in this currency; tiers and thresholds are read in it. */
  base: currencyCodeSchema,
  markets: z.array(marketSchema).min(1),
  /** One rule per market currency (checked by `validateBrandConfigs()`). */
  rounding: z.partialRecord(currencyCodeSchema, roundingRuleSchema),
  fx: z.strictObject({
    source: z.enum(['ecb-reference', 'manual']),
    /** Added to the daily rate before rounding, per target currency (3–5%). */
    bufferPct: z.partialRecord(currencyCodeSchema, z.number().min(0).max(20)),
  }),
})
export type MoneyConfig = z.infer<typeof moneyConfigSchema>

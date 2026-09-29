/**
 * @contract C1 — brand config: primitives · owner: ARC · entry: `@engine/config/schema`
 *
 * The leaf of the schema: ids, countries, destinations, currencies and money. C5
 * (`@engine/domain/money`) builds `Money` and `PriceSet` on `CurrencyCode` and
 * `CURRENCY_EXPONENT` from here; the domain never redeclares them.
 */
import { z } from 'zod'

/** A kebab-case id: sellers, markets, stock locations, sisters. */
export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a kebab-case id')

/**
 * The minor-unit exponent of each currency the engine prices in — the ENGINE's, which is ISO
 * 4217's for every currency but IDR: ISO lists two decimals for the rupiah, the engine none,
 * because no coin below Rp 1 circulates and the Indonesian gateways take whole rupiah. A
 * provider that counts IDR in hundredths is converted in its adapter (C5, C7). Never hard-code 100.
 */
export const CURRENCY_EXPONENT = { IDR: 0, USD: 2, SGD: 2, EUR: 2, AUD: 2, GBP: 2 } as const
export type CurrencyCode = keyof typeof CURRENCY_EXPONENT
/** Adding a currency is an additive contract change: an exponent here, then rounding rules. */
export const CURRENCY_CODES = Object.keys(CURRENCY_EXPONENT) as [CurrencyCode, ...CurrencyCode[]]
export const currencyCodeSchema = z.enum(CURRENCY_CODES)

/** ISO 3166-1 alpha-2, upper case. */
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'an ISO 3166-1 alpha-2 code')
export type CountryCode = z.infer<typeof countryCodeSchema>

/** A country, or `*` for the rest of the world. */
export const destinationSchema = z.union([countryCodeSchema, z.literal('*')])
export type Destination = z.infer<typeof destinationSchema>

/**
 * Money in integer minor units, inferring exactly C5's `{ amount: number; currency }`.
 * `z.int()` accepts safe integers only, so a float or an amount past 2^53 never parses, and
 * an amount is never negative (C5: a deduction is a non-negative figure named for itself).
 */
export const moneySchema = z.strictObject({
  amount: z.int().nonnegative(),
  currency: currencyCodeSchema,
})
export const positiveMoneySchema = moneySchema.refine((m) => m.amount > 0, 'a positive amount')

/**
 * Bands that ascend by `upTo` (minor units of the base or the band's currency), only the last
 * open-ended (`upTo: null`) — the shape of the purchase tiers and the price-point ladder.
 */
export function isLadder(bands: readonly { readonly upTo: number | null }[]): boolean {
  return bands.every((band, i) => {
    const next = bands[i + 1]
    if (!next) return band.upTo === null
    return band.upTo !== null && (next.upTo === null || next.upTo > band.upTo)
  })
}
export const LADDER_MESSAGE = 'bands ascend by upTo and only the last has upTo: null'

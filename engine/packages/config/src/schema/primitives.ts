/**
 * The money and place primitives: the currencies the engine prices in (declared zod-free in
 * `../constants` and re-exported here with their enum) and the ISO country code. Money itself is
 * integer minor units (`@engine/i18n`'s `Money`, CONVENTIONS.md §5).
 */
import { z } from 'zod'

import { CURRENCY_CODES, CURRENCY_EXPONENT, type CurrencyCode } from '../constants'

export { CURRENCY_CODES, CURRENCY_EXPONENT, type CurrencyCode }
export const currencyCodeSchema = z.enum(CURRENCY_CODES)

/** ISO 3166-1 alpha-2, upper case. */
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'an ISO 3166-1 alpha-2 code')
export type CountryCode = z.infer<typeof countryCodeSchema>

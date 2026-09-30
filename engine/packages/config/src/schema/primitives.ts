/**
 * @contract C1 — brand config: primitives · owner: ARC · entry: `@engine/config/schema`
 *
 * The leaf of the schema: ids, countries, destinations, currencies, money and the URLs a
 * config may name. C5 (`@engine/domain/money`) builds `Money` and `PriceSet` on `CurrencyCode`
 * and `CURRENCY_EXPONENT`, which the zod-free `@engine/config/constants` declares
 * (`../constants`) and this file re-exports; the domain never redeclares them.
 */
import { z } from 'zod'

import { CURRENCY_CODES, CURRENCY_EXPONENT, type CurrencyCode } from '../constants'
import { parseUrl } from './url'

export { CURRENCY_CODES, CURRENCY_EXPONENT, type CurrencyCode }
export const currencyCodeSchema = z.enum(CURRENCY_CODES)

/** A kebab-case id: sellers, markets, stock locations, sisters. */
export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a kebab-case id')

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

const HTTPS_URL_MESSAGE = 'an https:// URL on a public domain name, with no user or password in it'
/** Names no deployed site answers at: loopback (RFC 6761), mDNS, private use (ICANN, 2024), invalid. */
const NON_PUBLIC_NAME = /(?:^|\.)(?:localhost|local|internal|invalid)$/i
/**
 * A URL a config links to or calls: written `https://`, on a public domain name, carrying no
 * credentials — never `javascript:` or `data:`, never plain http, never an IP address,
 * `localhost` or a name under `.localhost`, `.local`, `.internal` or `.invalid`: a committed
 * config names only what a deployed site can reach.
 */
export const httpsUrlSchema = z.url({ error: HTTPS_URL_MESSAGE, abort: true }).refine(
  (value) => {
    const url = parseUrl(value)
    return (
      url !== null &&
      value.startsWith('https://') &&
      z.regexes.domain.test(url.hostname) &&
      !NON_PUBLIC_NAME.test(url.hostname) &&
      url.username === '' &&
      url.password === ''
    )
  },
  // One sentence per field: a URL that fails here is not checked for anything else.
  { error: HTTPS_URL_MESSAGE, abort: true },
)

/**
 * An https origin alone, exactly as a browser writes it — `https://shop.example.com`, or with a
 * port — no path, query, fragment or trailing `/`, lower case: what a request URL is built on and
 * a CSP source names.
 */
export const httpsOriginSchema = httpsUrlSchema.refine(
  (value) => parseUrl(value)?.origin === value,
  'an https origin such as "https://shop.example.com": no path, query or trailing "/", in lower case, a name that is not ASCII in punycode (https://xn--…)',
)

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

/**
 * Prices → C5 `Money` in integer minor units, or "price on request".
 *
 * The amount is built from its digits as text — "USD 1,500" is 150000 cents,
 * "1850.00" is 185000 — never through a float, and never rounded: a price
 * with more decimals than its currency has goes to review rather than being
 * rounded here (CONVENTIONS.md §3: rounding happens only at the named
 * rounding points). The exponents are the engine's (C1 `CURRENCY_EXPONENT`),
 * passed in through the tables, which accept no other. A zero price, a currency the tables do not
 * know, or a price beside a set on-request flag goes to review.
 */
import { hasExponent, type NormaliseTables } from './tables.ts'
import { clean, isBlank, key } from './text.ts'
import { accept, empty, review, type Money, type Parsed, type PriceValue } from './types.ts'

const PRICE_TEXT = /^(?:([A-Z]{3})\s*)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?:\s*([A-Z]{3}))?$/

export type PriceInput = {
  /** The price as the source held it: "USD 1,500", "On Request", "-", or a decimal "1850.00". */
  readonly text: string | null
  /** A separate "price on request" flag, where the source has one (a database column). */
  readonly onRequestFlag?: boolean | null
}

export function parsePrice(input: PriceInput, tables: NormaliseTables): Parsed<PriceValue> {
  const raw = describe(input)
  const text = clean(input.text)
  const flagged = input.onRequestFlag === true
  const phrase = text === null ? null : key(text)
  if (phrase !== null && tables.onRequest.some((term) => key(term) === phrase)) {
    return accept(raw, { mode: 'on-request', base: null })
  }
  const isNoPrice = isBlank(text) || tables.noPrice.some((term) => term.trim() === text)
  if (isNoPrice) {
    if (flagged) return accept(raw, { mode: 'on-request', base: null })
    return empty(raw, isBlank(text) ? null : 'no price shown')
  }

  const money = parseAmount(text ?? '', tables)
  if ('problem' in money) {
    if (flagged)
      return review(raw, { mode: 'on-request', base: null }, `on request, beside ${money.problem}`)
    return review(raw, null, money.problem)
  }
  if (flagged) {
    // The flag wins over a placeholder zero; a real amount beside it is a contradiction for a person.
    if (money.amount === 0) return accept(raw, { mode: 'on-request', base: null })
    return review(
      raw,
      { mode: 'on-request', base: null },
      'a price and the on-request flag both set',
    )
  }
  const fixed: PriceValue = { mode: 'fixed', base: money }
  if (money.amount === 0) return review(raw, fixed, 'a zero price')
  return accept(raw, fixed)
}

type Amount = Money | { problem: string }

function parseAmount(text: string, tables: NormaliseTables): Amount {
  const match = PRICE_TEXT.exec(text.replace(/\s+/g, ' ').trim())
  if (match === null) return { problem: 'unrecognised price wording' }
  const [, before, whole = '', fraction = '', after] = match
  if (before !== undefined && after !== undefined) return { problem: 'two currency codes' }
  const currency = before ?? after ?? tables.currency
  if (!hasExponent(tables, currency)) {
    return { problem: `a currency the tables do not know (${currency})` }
  }
  const exponent = tables.currencyExponents[currency]
  if (exponent === undefined) return { problem: `a currency the tables do not know (${currency})` }
  // "1.500" may be a thousands separator, "12.345" a third decimal: neither is read, or rounded, here.
  if (fraction.length > exponent) {
    return {
      problem: `more decimals than ${currency} has (a thousands separator?) — never rounded here`,
    }
  }
  const digits = whole.replace(/,/g, '') + fraction.padEnd(exponent, '0')
  const amount = Number(digits)
  if (!Number.isSafeInteger(amount)) return { problem: 'an amount beyond a safe integer' }
  return { amount, currency }
}

function describe(input: PriceInput): string | null {
  if (input.onRequestFlag === undefined || input.onRequestFlag === null) return input.text
  return `${input.text ?? 'NULL'} | on request: ${input.onRequestFlag ? 'yes' : 'no'}`
}

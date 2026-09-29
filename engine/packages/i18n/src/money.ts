/**
 * `formatMoney` — the one place a `Money` becomes text (C5, CONVENTIONS.md §3). A component
 * never formats, rounds or sums a Money itself.
 *
 * The fraction digits are pinned to the ENGINE's exponent (`CURRENCY_EXPONENT`, IDR 0) on
 * every call — never the runtime's ICU default, which differs between Node and browsers (some
 * give IDR two decimals), so how much precision a price shows never depends on where it was
 * formatted. That is not the whole text: symbols and spacing still come from each runtime's
 * locale data ("US$" or "$", a narrow or a plain space), so the server formats and a Client
 * Component receives the finished string rather than formatting again — the one way the
 * server's render and the browser's stay identical. The amount reaches `Intl` as an exact decimal string built from the
 * integer minor units — never a float, so nothing is rounded on the way, not even at 2^53.
 * A display estimate (`PriceSet.estimate`, C5) is a whole major unit and shows no fraction
 * digits at all; one that is not whole is a bug upstream and throws rather than rounding.
 */
import { CURRENCY_EXPONENT, type CurrencyCode, type LocaleCode } from '@engine/config/constants'

import { formattingTag } from './locales'

/** C5's `Money`: a safe integer of minor units and a currency. */
export type MoneyValue = { readonly amount: number; readonly currency: CurrencyCode }

/** C5's `PriceSet`, as far as display reads it. */
export type PriceValue = { readonly charge: MoneyValue; readonly estimate: MoneyValue | null }

export type FormatMoneyOptions = {
  /** A converted display estimate: whole major units, no fraction digits (C5). */
  readonly estimate?: boolean
  /** `symbol` (the default) · `code` (`IDR 95,000`) · `narrowSymbol` · `name`. */
  readonly currencyDisplay?: 'symbol' | 'code' | 'narrowSymbol' | 'name'
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(
  money: MoneyValue,
  locale: LocaleCode,
  options: FormatMoneyOptions = {},
): string {
  const exponent = exponentOf(money.currency)
  if (!Number.isSafeInteger(money.amount)) {
    throw new RangeError(
      `${money.amount} is not a safe integer of ${money.currency} minor units (C5)`,
    )
  }
  if (options.estimate && money.amount % 10 ** exponent !== 0) {
    throw new RangeError(
      `an estimate is a whole major unit (C5), and ${money.amount} ${money.currency} minor units is not`,
    )
  }
  const digits = options.estimate ? 0 : exponent
  return formatter(locale, money.currency, digits, options.currencyDisplay ?? 'symbol').format(
    toDecimal(money.amount, exponent),
  )
}

/** A price as its parts show it: the charge, and the estimate where the basis allows one. */
export function formatPrice(
  price: PriceValue,
  locale: LocaleCode,
): { charge: string; estimate: string | null } {
  return {
    charge: formatMoney(price.charge, locale),
    estimate: price.estimate ? formatMoney(price.estimate, locale, { estimate: true }) : null,
  }
}

/** Minor units as an exact decimal string: `145000` with exponent 2 → `"1450.00"`. */
export function toDecimal(amount: number, exponent: number): `${number}` {
  const sign = amount < 0 ? '-' : ''
  const digits = String(Math.abs(amount)).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = exponent > 0 ? `.${digits.slice(digits.length - exponent)}` : ''
  return `${sign}${whole}${fraction}` as `${number}`
}

function exponentOf(currency: CurrencyCode): number {
  const exponent = (CURRENCY_EXPONENT as Readonly<Record<string, number>>)[currency]
  if (exponent === undefined)
    throw new RangeError(`"${currency}" is not a currency the engine prices in (C1)`)
  return exponent
}

function formatter(
  locale: LocaleCode,
  currency: CurrencyCode,
  digits: number,
  currencyDisplay: NonNullable<FormatMoneyOptions['currencyDisplay']>,
): Intl.NumberFormat {
  const key = `${locale}|${currency}|${digits}|${currencyDisplay}`
  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.NumberFormat(formattingTag(locale), {
      style: 'currency',
      currency,
      currencyDisplay,
      // Both bounds, always: ICU's per-currency default never gets a say.
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    formatters.set(key, cached)
  }
  return cached
}

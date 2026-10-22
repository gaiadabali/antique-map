// A runtime whose ICU disagrees with the engine — as some browsers do, giving IDR two
// decimals — must change nothing: formatMoney sets both fraction-digit bounds itself, so an
// amount's digits never depend on the runtime (C5, CONVENTIONS.md §3). Its symbol and spacing
// still may, which is why a Client Component shows the server's string (CONVENTIONS.md §6).
// Its own file: formatMoney caches its formatters per module, so the stub goes in first.
import { CURRENCY_CODES, CURRENCY_EXPONENT } from '@engine/config/constants'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { formatMoney } from '../src/index'

const RealNumberFormat = Intl.NumberFormat
const seen: Intl.NumberFormatOptions[] = []
/** Every currency defaults to THREE fraction digits here, unless the caller says otherwise. */
function DisagreeingNumberFormat(
  locales?: string | string[],
  options: Intl.NumberFormatOptions = {},
) {
  seen.push(options)
  return new RealNumberFormat(locales, {
    ...options,
    minimumFractionDigits: options.minimumFractionDigits ?? 3,
    maximumFractionDigits: options.maximumFractionDigits ?? 3,
  })
}
vi.stubGlobal('Intl', { ...Intl, NumberFormat: DisagreeingNumberFormat })
afterAll(() => void vi.unstubAllGlobals())

describe('formatMoney under a runtime whose ICU default disagrees', () => {
  it('never takes the runtime default: IDR stays whole, USD stays at two', () => {
    expect(new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'IDR' }).format(1)).toBe(
      'IDR 1.000',
    )
    expect(formatMoney({ amount: 1450000, currency: 'IDR' }, 'en')).toBe('IDR 1,450,000')
    expect(formatMoney({ amount: 110000, currency: 'USD' }, 'en')).toBe('US$1,100.00')
  })

  it('passes both bounds, equal to CURRENCY_EXPONENT, for every currency — and zero for an estimate', () => {
    seen.length = 0
    for (const currency of CURRENCY_CODES) {
      formatMoney({ amount: 100000, currency }, 'id')
      formatMoney({ amount: 100000, currency }, 'nl', { estimate: true })
    }
    const calls = seen.filter((options) => options.style === 'currency')
    expect(calls).toHaveLength(CURRENCY_CODES.length * 2)
    CURRENCY_CODES.forEach((currency, i) => {
      const exponent = CURRENCY_EXPONENT[currency]
      expect(calls[2 * i]).toMatchObject({
        currency,
        minimumFractionDigits: exponent,
        maximumFractionDigits: exponent,
      })
      expect(calls[2 * i + 1]).toMatchObject({
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    })
  })
})

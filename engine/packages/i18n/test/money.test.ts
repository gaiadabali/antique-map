import { CURRENCY_CODES, CURRENCY_EXPONENT, LOCALE_CODES } from '@engine/config/constants'
import { describe, expect, it } from 'vitest'

import { formatMoney, formatPrice, toDecimal } from '../src/index'

const NBSP = ' '

describe('formatMoney — fraction digits are the engine’s, never ICU’s (C5)', () => {
  it('IDR has no decimals, in every locale', () => {
    expect(formatMoney({ amount: 1450000, currency: 'IDR' }, 'id')).toBe(`Rp${NBSP}1.450.000`)
    expect(formatMoney({ amount: 1450000, currency: 'IDR' }, 'en')).toBe(`IDR${NBSP}1,450,000`)
    expect(formatMoney({ amount: 95000, currency: 'IDR' }, 'nl')).not.toMatch(/,\d/)
  })

  it('two-decimal currencies show their minor units exactly', () => {
    expect(formatMoney({ amount: 110000, currency: 'USD' }, 'en')).toBe('US$1,100.00')
    expect(formatMoney({ amount: 95350, currency: 'EUR' }, 'nl')).toBe(`€${NBSP}953,50`)
    expect(formatMoney({ amount: 5, currency: 'SGD' }, 'en')).toBe(`SGD${NBSP}0.05`)
    expect(formatMoney({ amount: 0, currency: 'GBP' }, 'en')).toBe('£0.00')
  })

  it('pins every currency’s fraction digits to CURRENCY_EXPONENT, in every locale', () => {
    for (const currency of CURRENCY_CODES) {
      for (const locale of LOCALE_CODES) {
        const text = formatMoney({ amount: 123456789, currency }, locale)
        const decimal = locale === 'en' ? '.' : ','
        const fraction = text.split(decimal)[1]?.replace(/\D/g, '') ?? ''
        expect(fraction.length, `${currency} in ${locale}: ${text}`).toBe(
          CURRENCY_EXPONENT[currency],
        )
      }
    }
  })

  it('is exact to the minor unit up to the largest safe integer — no float on the way', () => {
    expect(formatMoney({ amount: Number.MAX_SAFE_INTEGER, currency: 'USD' }, 'en')).toBe(
      'US$90,071,992,547,409.91',
    )
    expect(formatMoney({ amount: 1, currency: 'USD' }, 'en')).toBe('US$0.01')
  })

  it('a display estimate renders with no fraction digits at all', () => {
    expect(formatMoney({ amount: 96000, currency: 'EUR' }, 'en', { estimate: true })).toBe('€960')
    expect(formatMoney({ amount: 96000, currency: 'EUR' }, 'nl', { estimate: true })).toBe(
      `€${NBSP}960`,
    )
    expect(formatMoney({ amount: 1450000, currency: 'IDR' }, 'id', { estimate: true })).toBe(
      `Rp${NBSP}1.450.000`,
    )
    expect(
      formatPrice(
        {
          charge: { amount: 110000, currency: 'USD' },
          estimate: { amount: 102000, currency: 'EUR' },
        },
        'en',
      ),
    ).toEqual({ charge: 'US$1,100.00', estimate: '€1,020' })
    expect(
      formatPrice({ charge: { amount: 1450000, currency: 'IDR' }, estimate: null }, 'id').estimate,
    ).toBeNull()
  })

  it('refuses an estimate that is not a whole major unit, a float and an unsafe amount — it never rounds', () => {
    expect(() => formatMoney({ amount: 95950, currency: 'EUR' }, 'en', { estimate: true })).toThrow(
      /an estimate is a whole major unit/,
    )
    expect(() => formatMoney({ amount: 10.5, currency: 'USD' }, 'en')).toThrow(/not a safe integer/)
    expect(() => formatMoney({ amount: 2 ** 53, currency: 'USD' }, 'en')).toThrow(
      /not a safe integer/,
    )
    expect(() => formatMoney({ amount: 1, currency: 'XYZ' as 'USD' }, 'en')).toThrow(
      /not a currency the engine prices in/,
    )
  })

  it('offers the ISO code instead of a symbol', () => {
    expect(
      formatMoney({ amount: 110000, currency: 'USD' }, 'en', { currencyDisplay: 'code' }),
    ).toBe(`USD${NBSP}1,100.00`)
  })
})

describe('toDecimal — minor units to an exact decimal string', () => {
  it.each([
    [145000, 2, '1450.00'],
    [5, 2, '0.05'],
    [0, 2, '0.00'],
    [1450000, 0, '1450000'],
    [-250, 2, '-2.50'],
    [Number.MAX_SAFE_INTEGER, 2, '90071992547409.91'],
  ])('%d at exponent %d is %s', (amount, exponent, expected) => {
    expect(toDecimal(amount, exponent)).toBe(expected)
  })
})

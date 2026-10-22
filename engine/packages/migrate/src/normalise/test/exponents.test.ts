// The tables' currency exponents are C1's (TASKS.md 7.4.b). The CLIs run under
// Node's type stripping, which cannot load `@engine/config/constants`, so the
// normalisers carry the exponents in their tables; vitest can load C1, and holds
// them to it here.
import { CURRENCY_CODES, CURRENCY_EXPONENT } from '@engine/config/constants'
import { describe, expect, it } from 'vitest'

import { DEFAULT_TABLES, ENGINE_CURRENCY_EXPONENT, parseTables } from '../tables.ts'

describe('currency exponents — C1 CURRENCY_EXPONENT, never the tables’ own', () => {
  it('the engine table is C1’s, code for code', () => {
    expect(ENGINE_CURRENCY_EXPONENT).toEqual(CURRENCY_EXPONENT)
  })

  it('every currency in the default tables is a C1 code, at C1’s exponent', () => {
    expect(CURRENCY_CODES).toContain(DEFAULT_TABLES.currency)
    for (const [code, exponent] of Object.entries(DEFAULT_TABLES.currencyExponents)) {
      expect(CURRENCY_CODES).toContain(code)
      expect(exponent).toBe(CURRENCY_EXPONENT[code as keyof typeof CURRENCY_EXPONENT])
    }
  })

  it('a tables file may name any C1 currency at C1’s exponent', () => {
    const all = parseTables({ currencyExponents: { ...CURRENCY_EXPONENT } })
    for (const code of CURRENCY_CODES) {
      expect(all.currencyExponents[code]).toBe(CURRENCY_EXPONENT[code])
    }
  })

  it.each([
    [{ currencyExponents: { USD: 3 } }, '"currencyExponents" USD: 3 is not the engine\'s'],
    [{ currencyExponents: { IDR: 2 } }, '"currencyExponents" IDR: 2 is not the engine\'s'],
    [{ currencyExponents: { XYZ: 2 } }, '"currencyExponents" XYZ: 2 is not the engine\'s'],
    [{ currency: 'IDR' }, '"currency" IDR has no entry in "currencyExponents"'],
    [{ currency: 'XYZ', currencyExponents: { USD: 2 } }, '"currency" XYZ has no entry'],
  ])('refuses %j', (input, message) => {
    expect(() => parseTables(input)).toThrow(message)
  })
})

// C1's zod-free leaf (TASKS.md 3.4.a, 3.1 senior-fe #1): it imports nothing outside its folder,
// and the schema entry re-exports the very same values and builds its enums on them — one
// declaration, two entries.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import * as schema from '../schema'
import * as constants from './index'

const FOLDER = fileURLToPath(new URL('.', import.meta.url))
const SPECIFIERS =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g

describe('@engine/config/constants — the zod-free leaf of C1', () => {
  it('imports nothing from outside its own folder', () => {
    const sources = readdirSync(FOLDER).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
    )
    expect(sources.sort()).toEqual(['currencies.ts', 'facets.ts', 'index.ts', 'locales.ts'])
    for (const file of sources) {
      const text = readFileSync(`${FOLDER}${file}`, 'utf8')
      const specifiers = [...text.matchAll(SPECIFIERS)].map((match) => match[1] ?? '')
      expect(
        specifiers.filter((specifier) => !/^\.\/[a-z-]+$/.test(specifier)),
        file,
      ).toEqual([])
    }
  })

  it('is what @engine/config/schema re-exports, the same objects', () => {
    expect(schema.LOCALE_CODES).toBe(constants.LOCALE_CODES)
    expect(schema.CURRENCY_EXPONENT).toBe(constants.CURRENCY_EXPONENT)
    expect(schema.CURRENCY_CODES).toBe(constants.CURRENCY_CODES)
    expect(schema.localeCodeSchema.options).toEqual([...constants.LOCALE_CODES])
    expect(schema.currencyCodeSchema.options).toEqual([...constants.CURRENCY_CODES])
  })

  it('holds the engine’s exponents: IDR 0, where ISO 4217 lists 2', () => {
    expect(constants.CURRENCY_EXPONENT).toEqual({ IDR: 0, USD: 2, SGD: 2, EUR: 2, AUD: 2, GBP: 2 })
    expect(constants.CURRENCY_CODES).toEqual(Object.keys(constants.CURRENCY_EXPONENT))
    expect(constants.LOCALE_CODES).toEqual(['en', 'id', 'nl'])
  })
})

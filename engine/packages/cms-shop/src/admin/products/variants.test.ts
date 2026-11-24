/** The variant builder's arithmetic: options to combinations, SKUs, and back. */
import { describe, expect, it } from 'vitest'

import { SKU_MAX_LENGTH, SKU_PATTERN } from '../../collections/products/skus'
import {
  buildVariants,
  combinations,
  inferOptions,
  parseValues,
  skuPart,
  variantSku,
} from './variants'

const SIZE = { name: 'Size', values: ['A4', 'A3'] }
const FRAME = { name: 'Frame', values: ['None', 'Dark wood'] }

describe('parseValues', () => {
  it('splits on commas and lines, trims, drops blanks and repeats whatever their case', () => {
    expect(parseValues(' A4, A3 ,,a4\nA2  ')).toEqual(['A4', 'A3', 'A2'])
    expect(parseValues('   ')).toEqual([])
  })
})

describe('combinations', () => {
  it('is every combination, the first option varying slowest', () => {
    expect(combinations([SIZE, FRAME])).toEqual([
      ['A4', 'None'],
      ['A4', 'Dark wood'],
      ['A3', 'None'],
      ['A3', 'Dark wood'],
    ])
  })

  it('skips an option without values, and is empty without any', () => {
    expect(combinations([SIZE, { name: 'Frame', values: [] }])).toEqual([['A4'], ['A3']])
    expect(combinations([])).toEqual([])
    expect(combinations([{ name: 'Size', values: [] }])).toEqual([])
  })
})

describe('SKUs', () => {
  it('turns a value into a SKU part', () => {
    expect(skuPart('Dark wood')).toBe('DARK-WOOD')
    expect(skuPart(' Hitam/Putih ')).toBe('HITAM-PUTIH')
    expect(skuPart('Café')).toBe('CAFE')
    expect(skuPart('—')).toBe('')
  })

  it('builds a variant SKU from the product SKU, valid and within the length', () => {
    expect(variantSku('PRT-1', ['A4', 'Dark wood'])).toBe('PRT-1-A4-DARK-WOOD')
    const long = variantSku('X'.repeat(70), ['A4'])
    expect(long.length).toBeLessThanOrEqual(SKU_MAX_LENGTH)
    expect(long.endsWith('-A4')).toBe(true)
    expect(SKU_PATTERN.test(long)).toBe(true)
  })
})

describe('buildVariants', () => {
  it('makes one row per combination, on sale, priced by the product', () => {
    expect(buildVariants([SIZE, FRAME], 'PRT-1')).toEqual([
      { sku: 'PRT-1-A4-NONE', label: 'A4 / None', price: null, active: true },
      { sku: 'PRT-1-A4-DARK-WOOD', label: 'A4 / Dark wood', price: null, active: true },
      { sku: 'PRT-1-A3-NONE', label: 'A3 / None', price: null, active: true },
      { sku: 'PRT-1-A3-DARK-WOOD', label: 'A3 / Dark wood', price: null, active: true },
    ])
  })

  it('keeps an existing row’s SKU, price and switch, and drops a gone combination', () => {
    const existing = [
      { sku: 'OLD-A4', label: 'a4', price: 150000, active: false },
      { sku: 'OLD-A5', label: 'A5', price: 90000, active: true },
    ]
    expect(buildVariants([SIZE], 'PRT-1', existing)).toEqual([
      { sku: 'OLD-A4', label: 'A4', price: 150000, active: false },
      { sku: 'PRT-1-A3', label: 'A3', price: null, active: true },
    ])
  })

  it('never gives two rows one SKU', () => {
    const rows = buildVariants([{ name: 'Size', values: ['A 4', 'A-4', 'A4'] }], 'P')
    expect(rows.map((row) => row.sku)).toEqual(['P-A-4', 'P-A-4-2', 'P-A4'])
    const clash = buildVariants([SIZE], 'P', [
      { sku: 'P-A3', label: 'A4', price: null, active: true },
    ])
    expect(clash.map((row) => row.sku)).toEqual(['P-A3', 'P-A3-2'])
  })
})

describe('inferOptions', () => {
  it('reads the options back from labels that split evenly', () => {
    expect(inferOptions(['A4 / None', 'A4 / Wood', 'A3 / None'])).toEqual([
      { name: 'Option 1', values: ['A4', 'A3'] },
      { name: 'Option 2', values: ['None', 'Wood'] },
    ])
  })

  it('takes uneven labels whole, as one option, and nothing from none', () => {
    expect(inferOptions(['A4', 'A3 / Wood'], (i) => `Opsi ${i + 1}`)).toEqual([
      { name: 'Opsi 1', values: ['A4', 'A3 / Wood'] },
    ])
    expect(inferOptions(['', ' '])).toEqual([])
  })

  it('round-trips: the inferred options build the same labels', () => {
    const labels = buildVariants([SIZE, FRAME], 'P').map((row) => row.label)
    const again = buildVariants(inferOptions(labels), 'P').map((row) => row.label)
    expect(again).toEqual(labels)
  })
})

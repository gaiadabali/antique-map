/**
 * The shop's categories are vocabulary (DATA.md §2): every category the committed products sheet
 * names is one the vocabulary layer seeds — else the import holds the product and rejects its
 * variants. Each carries its Indonesian label.
 */
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { PRODUCT_COLUMNS } from '../../import/kinds'
import { parseCsv } from '../../import/csv'
import { fold } from '../../import/vocabulary'
import { categorySeeds } from './seed'

describe('the shop categories', () => {
  it('cover every category the committed products sheet names', () => {
    const bytes = readFileSync(new URL('../shop/data/products.csv', import.meta.url))
    const sheet = parseCsv('products.csv', bytes, 'products', PRODUCT_COLUMNS)
    const column = PRODUCT_COLUMNS.indexOf('category')
    const named = new Set(sheet.rows.map((row) => fold(row.cells[column] ?? '')))
    const seeded = new Set(categorySeeds().map((seed) => fold(seed.label)))
    expect(named.size).toBeGreaterThan(0)
    for (const category of named) expect(seeded.has(category), category).toBe(true)
  })

  it('carry both labels', () => {
    for (const seed of categorySeeds()) {
      expect(seed.label.trim()).not.toBe('')
      expect(seed.labelId?.trim()).not.toBe('')
    }
  })
})

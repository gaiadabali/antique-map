/**
 * The stock matrix's rows and filters (TASKS.md 27.4.b): a line per product or variant, a variant's
 * SKU finding its line alone, low at or below the threshold (and never for a store that does not
 * stock the line), and the address a filter or a page writes.
 */
import { describe, expect, it } from 'vitest'

import {
  cleanQuery,
  isLow,
  linesOf,
  lowLines,
  matrixHref,
  readQuery,
  storeColumns,
  STORES_PER_PAGE,
  type MatrixProduct,
  type MatrixRow,
} from './grid'

const MUG: MatrixProduct = { id: 1, name: 'Batik mug', sku: 'OEI-MUG', variants: [] }
const PRINT: MatrixProduct = {
  id: 2,
  name: 'Map print',
  sku: 'OEI-PRINT',
  variants: [
    { sku: 'OEI-PRINT-A3', label: 'A3' },
    { sku: 'OEI-PRINT-A4', label: 'A4' },
  ],
}

const row = (product: number, variantSku: string | null, store: number, quantity: number) =>
  ({ id: `${product}${variantSku}${store}`, product, variantSku, store, quantity }) as MatrixRow

describe('linesOf', () => {
  it('a line per product without variants, and per variant otherwise', () => {
    expect(linesOf([MUG, PRINT], '').map((line) => [line.sku, line.variantSku])).toEqual([
      ['OEI-MUG', null],
      ['OEI-PRINT-A3', 'OEI-PRINT-A3'],
      ['OEI-PRINT-A4', 'OEI-PRINT-A4'],
    ])
  })

  it('a search naming a variant’s SKU shows that variant alone; the product’s name shows all', () => {
    expect(linesOf([PRINT], 'print-a4').map((line) => line.variantLabel)).toEqual(['A4'])
    expect(linesOf([PRINT], 'map')).toHaveLength(2)
    expect(linesOf([PRINT], 'OEI-PRINT')).toHaveLength(2)
  })
})

describe('low stock', () => {
  it('is at or below the threshold', () => {
    expect(isLow(2, 2)).toBe(true)
    expect(isLow(0, 2)).toBe(true)
    expect(isLow(3, 2)).toBe(false)
  })

  it('keeps the lines with a low row; a store that does not stock a line makes it not low', () => {
    const lines = linesOf([MUG, PRINT], '')
    const rows = [row(1, null, 10, 5), row(2, 'OEI-PRINT-A3', 10, 1), row(2, 'OEI-PRINT-A4', 10, 9)]
    expect(lowLines(lines, rows, 2).map((line) => line.sku)).toEqual(['OEI-PRINT-A3'])
    expect(lowLines(lines, [], 2)).toEqual([])
  })
})

describe('the address', () => {
  it('reads the query, defaulting what it cannot read', () => {
    expect(readQuery({ q: '  mug ', page: '3', low: '1', store: '7', cols: '2' })).toEqual({
      q: 'mug',
      page: 3,
      low: true,
      store: '7',
      cols: 2,
    })
    expect(readQuery({ page: '-2', low: 'yes', q: ['a', 'b'] })).toEqual({
      q: 'a',
      page: 1,
      low: false,
      store: '',
      cols: 1,
    })
    expect(cleanQuery('x'.repeat(150))).toHaveLength(100)
  })

  it('writes it back; a filter change starts at page 1', () => {
    const query = { q: 'batik mug', page: 3, low: false, store: '7', cols: 1 }
    expect(matrixHref(query, { page: 4 })).toBe('/admin/stock?q=batik%20mug&store=7&page=4')
    expect(matrixHref(query, { low: true })).toBe('/admin/stock?q=batik%20mug&store=7&low=1')
    expect(matrixHref({ q: '', page: 1, low: false, store: '', cols: 1 })).toBe('/admin/stock')
    // The store columns' page is kept with the products' page, and dropped when one store is picked.
    const all = { q: '', page: 2, low: false, store: '', cols: 3 }
    expect(matrixHref(all, { page: 3 })).toBe('/admin/stock?page=3&cols=3')
    expect(matrixHref(all, { store: '7' })).toBe('/admin/stock?store=7')
  })

  it('pages the store columns ten at a time, a page past the last showing the last', () => {
    const stores = Array.from({ length: 23 }, (_, i) => i)
    expect(storeColumns(stores, 1)).toEqual({ shown: stores.slice(0, STORES_PER_PAGE), pages: 3 })
    expect(storeColumns(stores, 9).shown).toEqual([20, 21, 22])
    expect(storeColumns([], 1)).toEqual({ shown: [], pages: 1 })
  })
})

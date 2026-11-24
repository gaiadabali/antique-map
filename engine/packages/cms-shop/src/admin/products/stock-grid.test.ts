/** The stock table's model: columns, stores shown, counts and the request each becomes. */
import { describe, expect, it } from 'vitest'

import {
  canStart,
  cellKey,
  columnsOf,
  heldBack,
  indexRows,
  parseCount,
  stockRequest,
  totalOf,
  visibleStores,
} from './stock-grid'

const stores = [
  { id: 3, name: 'Ubud 001', code: 'UBD-001' },
  { id: 1, name: 'Canggu 001', code: 'CGU-001' },
  { id: 2, name: 'Denpasar 004', code: 'DPS-004' },
]
const rows = indexRows([
  { id: 10, store: 2, variantSku: 'P-A4', quantity: 3 },
  { id: 11, store: 2, variantSku: 'P-A3', quantity: 1 },
  { id: 12, store: 3, variantSku: 'P-A4', quantity: 0 },
])

describe('columnsOf', () => {
  it('is one column per variant with a SKU, labelled by the variant', () => {
    expect(columnsOf([{ sku: 'P-A4', label: 'A4' }, { sku: 'P-A3' }, { label: 'x' }], 'P')).toEqual(
      [
        { sku: 'P-A4', label: 'A4' },
        { sku: 'P-A3', label: 'P-A3' },
      ],
    )
  })

  it('is one column for the product itself without variants', () => {
    expect(columnsOf([], 'On the shelf')).toEqual([{ sku: null, label: 'On the shelf' }])
  })
})

describe('parseCount', () => {
  it('takes a whole number of at least 0, nothing for an empty box, and refuses the rest', () => {
    expect(parseCount(' 12 ')).toBe(12)
    expect(parseCount('0')).toBe(0)
    expect(parseCount('')).toBeUndefined()
    for (const bad of ['-1', '1.5', '3a', '1e3', '99999999999999999999']) {
      expect(parseCount(bad), bad).toBeNull()
    }
  })
})

describe('visibleStores', () => {
  it('lists the stores holding the product first, each group by name, up to the limit', () => {
    const shown = visibleStores(stores, rows, '', { limit: 2, all: false })
    expect(shown.stores.map((store) => store.id)).toEqual([2, 3])
    expect(shown.total).toBe(3)
    expect(visibleStores(stores, rows, '', { limit: 2, all: true }).stores).toHaveLength(3)
  })

  it('finds a store by name or code, past the limit', () => {
    expect(visibleStores(stores, rows, 'cgu', { limit: 1, all: false }).stores).toEqual([stores[1]])
    expect(visibleStores(stores, rows, 'Denpasar', { limit: 0, all: false }).total).toBe(1)
  })
})

describe('stockRequest', () => {
  it('updates an existing row with the shelf count', () => {
    expect(
      stockRequest({
        row: rows.get(cellKey(2, 'P-A4')),
        store: 2,
        product: 7,
        variantSku: 'P-A4',
        count: 5,
      }),
    ).toEqual({ method: 'PATCH', url: '/api/stock-levels/10?depth=0', body: { physicalCount: 5 } })
  })

  it('starts a row for the store, product and variant, and none for a product without', () => {
    expect(
      stockRequest({ row: undefined, store: 1, product: 7, variantSku: 'P-A3', count: 2 }),
    ).toEqual({
      method: 'POST',
      url: '/api/stock-levels?depth=0',
      body: { store: 1, product: 7, variantSku: 'P-A3', physicalCount: 2 },
    })
    expect(
      stockRequest({ row: undefined, store: 1, product: 7, variantSku: null, count: 0 }).body,
    ).toEqual({ store: 1, product: 7, physicalCount: 0 })
  })

  it('lets only the owner start a row', () => {
    expect(canStart('owner')).toBe(true)
    expect(canStart('editor')).toBe(false)
    expect(canStart('store')).toBe(false)
  })
})

describe('totals', () => {
  it('sums a column, or everything', () => {
    expect(totalOf(rows, 'P-A4')).toBe(3)
    expect(totalOf(rows)).toBe(4)
  })

  it('reports the units held back from a count', () => {
    expect(heldBack(5, 3)).toBe(2)
    expect(heldBack(2, 2)).toBe(0)
  })
})

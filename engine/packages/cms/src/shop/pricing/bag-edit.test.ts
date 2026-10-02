/** Changing the bag (TASKS.md 6.2.a): merges, the 10-of-one and 20-line caps, removal. */
import { describe, expect, it } from 'vitest'

import { MAX_BAG_LINES } from './bag'
import { addToBag, removeFromBag, setBagLineQty } from './bag-edit'
import { line } from './pricing.test-support'

describe('adding to the bag', () => {
  it('adds a new line and merges the same product and variant', () => {
    expect(addToBag([], { productId: '1', qty: '2' })).toEqual({
      outcome: 'added',
      lines: [line(1, 2)],
    })
    expect(addToBag([line(1, 2)], line(1, 3))).toEqual({ outcome: 'updated', lines: [line(1, 5)] })
    expect(addToBag([line(2, 1, 'PRINT-A3')], line(2, 1, 'PRINT-A2')).lines).toHaveLength(2)
  })

  it('caps one line at 10 and says so', () => {
    expect(addToBag([line(1, 8)], line(1, 5))).toEqual({ outcome: 'capped', lines: [line(1, 10)] })
  })

  it('refuses a 21st line and an invalid request, changing nothing', () => {
    const full = Array.from({ length: MAX_BAG_LINES }, (_, i) => line(i + 1, 1))
    expect(addToBag(full, line(99, 1))).toEqual({ outcome: 'full', lines: full })
    expect(addToBag(full, line(1, 1)).outcome).toBe('updated')
    expect(addToBag([line(1, 1)], { productId: 1, qty: 50, price: 1 })).toEqual({
      outcome: 'invalid',
      lines: [line(1, 1)],
    })
  })
})

describe('setting a quantity and removing', () => {
  it('sets a line’s quantity, never adds one, and removes at 0', () => {
    expect(setBagLineQty([line(1, 1)], line(1, 4))).toEqual({
      outcome: 'updated',
      lines: [line(1, 4)],
    })
    expect(setBagLineQty([line(1, 1)], line(2, 4))).toEqual({
      outcome: 'unchanged',
      lines: [line(1, 1)],
    })
    expect(setBagLineQty([line(1, 1), line(5, 2)], { productId: 1, qty: '0' })).toEqual({
      outcome: 'removed',
      lines: [line(5, 2)],
    })
    expect(setBagLineQty([line(1, 1)], { productId: 1, qty: 11 }).outcome).toBe('invalid')
  })

  it('removes by product and variant, whatever quantity is sent', () => {
    const bag = [line(2, 1, 'PRINT-A3'), line(2, 1, 'PRINT-A2')]
    expect(removeFromBag(bag, { productId: 2, variantSku: 'PRINT-A2', qty: 999 })).toEqual({
      outcome: 'removed',
      lines: [line(2, 1, 'PRINT-A3')],
    })
    expect(removeFromBag(bag, { productId: 7 }).outcome).toBe('unchanged')
    expect(removeFromBag(bag, 'nonsense').outcome).toBe('invalid')
  })
})

/**
 * Products without a database (CONTENT-MODEL.md §3, §7; CONVENTIONS.md §5): who reads and writes
 * one, and the whole-rupiah rule every money field and CHECK shares. The database proofs are
 * `./products.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { PRODUCTS_ACCESS, PUBLISHED_ONLY, readProducts } from './access'
import { Products } from './index'
import { isWhole, wholeCheck, wholeNumber } from './money'

const as = (user: unknown) => ({ req: { user } }) as never
const owner = { id: 1, collection: 'users', role: 'owner' }
const editor = { id: 2, collection: 'users', role: 'editor' }
const storeUser = { id: 3, collection: 'users', role: 'store', store: 7 }

describe('who reaches a product', () => {
  it('shows staff every product, drafts included, and anyone else published ones', () => {
    for (const user of [owner, editor, storeUser]) expect(readProducts(as(user))).toBe(true)
    for (const user of [null, { id: 9, collection: 'customers', role: 'owner' }]) {
      expect(readProducts(as(user))).toEqual(PUBLISHED_ONLY)
    }
    expect(PUBLISHED_ONLY).toEqual({ _status: { equals: 'published' } })
  })

  it('lets the owner and editors write and read versions; store staff and the public neither', () => {
    expect(Products.access).toBe(PRODUCTS_ACCESS)
    for (const operation of ['create', 'update', 'delete', 'readVersions'] as const) {
      for (const user of [owner, editor]) expect(PRODUCTS_ACCESS[operation](as(user))).toBe(true)
      for (const user of [storeUser, null]) expect(PRODUCTS_ACCESS[operation](as(user))).toBe(false)
    }
  })

  it('keeps drafts, validated on every save', () => {
    expect(Products.versions).toEqual({ drafts: { validate: true } })
  })
})

describe('whole rupiah', () => {
  const price = wholeNumber({ min: 1, what: 'The price' })
  const fee = wholeNumber({ min: 0, what: 'The fee' })
  const qty = wholeNumber({ min: 1, what: 'A quantity', unit: 'units' })
  const opts = (required: boolean) => ({ required }) as never

  it('takes a safe whole number at or above the minimum', () => {
    expect(price(95000, opts(true))).toBe(true)
    expect(fee(0, opts(true))).toBe(true)
    expect(isWhole(Number.MAX_SAFE_INTEGER + 1, 0)).toBe(false)
  })

  it('refuses a fraction, a negative, zero for a price, and a string', () => {
    expect(price(95000.5, opts(true))).toMatch(/whole number of rupiah above zero/)
    expect(price(0, opts(true))).toMatch(/above zero/)
    expect(fee(-1, opts(true))).toMatch(/zero or more/)
    expect(qty(0, opts(true))).toBe('A quantity is a whole number, 1 or more.')
    expect(price('95000' as never, opts(true))).toMatch(/whole number/)
  })

  it('enforces `required` itself, since a custom validate replaces Payload’s', () => {
    expect(price(null, opts(true))).toBe('The price is required.')
    expect(price(undefined, opts(false))).toBe(true)
  })

  it('writes the matching CHECK, nullable or not', () => {
    expect(wholeCheck('price', 1)).toBe('price IS NULL OR (price >= 1 AND price = trunc(price))')
    expect(wholeCheck('quantity', 0, { nullable: false })).toBe(
      'quantity IS NOT NULL AND quantity >= 0 AND quantity = trunc(quantity)',
    )
  })
})

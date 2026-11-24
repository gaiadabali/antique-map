/**
 * Discount codes without a database (CONTENT-MODEL.md §4, §7; COMMERCE.md §5): the owner's alone,
 * and the save rules' plain reasons. The database proofs are `./discounts.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { Discounts, DISCOUNTS_ACCESS } from './index'
import { validateEndsAt, validatePercent, validateUsageLimit } from './rules'

const as = (user: unknown) => ({ req: { user } }) as never
const on = (siblingData: Record<string, unknown>) => ({ siblingData }) as never

describe('who reaches a discount code', () => {
  it('is the owner alone, for every operation', () => {
    expect(Discounts.access).toBe(DISCOUNTS_ACCESS)
    for (const operation of ['read', 'create', 'update', 'delete'] as const) {
      expect(DISCOUNTS_ACCESS[operation](as({ id: 1, collection: 'users', role: 'owner' }))).toBe(
        true,
      )
      for (const user of [
        { id: 2, collection: 'users', role: 'editor' },
        { id: 3, collection: 'users', role: 'store', store: 1 },
        null,
      ]) {
        expect(DISCOUNTS_ACCESS[operation](as(user))).toBe(false)
      }
    }
  })
})

describe('a discount’s rules', () => {
  it('keeps a percent to 1–100 and a rupiah amount whole and above zero', () => {
    expect(validatePercent(10, on({ kind: 'percent' }))).toBe(true)
    expect(validatePercent(101, on({ kind: 'percent' }))).toMatch(/1 to 100 percent/)
    expect(validatePercent(12.5, on({ kind: 'percent' }))).toMatch(/1 to 100 percent/)
    expect(validatePercent(50000, on({ kind: 'fixed' }))).toBe(true)
    expect(validatePercent(0, on({ kind: 'fixed' }))).toMatch(/above zero/)
    expect(validatePercent(null, on({ kind: 'fixed' }))).toMatch(/how much the code takes off/)
  })

  it('ends after it starts', () => {
    const startsAt = '2026-11-01T00:00:00.000Z'
    expect(validateEndsAt('2026-12-01T00:00:00.000Z', on({ startsAt }))).toBe(true)
    expect(validateEndsAt(startsAt, on({ startsAt }))).toMatch(/end after it starts/)
    expect(validateEndsAt(null, on({ startsAt }))).toBe(true)
  })

  it('allows at least the uses already counted', () => {
    expect(validateUsageLimit(null, on({ usedCount: 3 }))).toBe(true)
    expect(validateUsageLimit(5, on({ usedCount: 3 }))).toBe(true)
    expect(validateUsageLimit(2, on({ usedCount: 3 }))).toMatch(/already been used 3 times/)
    expect(validateUsageLimit(0, on({}))).toMatch(/1 or more/)
  })
})

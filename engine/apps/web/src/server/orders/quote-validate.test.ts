/**
 * `parseFeeIdr` (TASKS.md 6.6.c): the admin "Send price" input's own validation, ahead of the
 * core's own (`quoteDeliveryFee`, 0–10,000,000 rupiah, a safe integer) — this is a UI-level refusal
 * before the request ever reaches the core, not a replacement for it.
 */
import { describe, expect, it } from 'vitest'

import { parseFeeIdr } from './quote-validate'

describe('parseFeeIdr', () => {
  it('accepts 0 (free delivery)', () => {
    expect(parseFeeIdr('0')).toBe(0)
  })

  it('accepts a whole rupiah amount', () => {
    expect(parseFeeIdr('25000')).toBe(25000)
  })

  it('refuses a negative amount', () => {
    expect(parseFeeIdr('-1')).toBeNull()
  })

  it('refuses a fraction', () => {
    expect(parseFeeIdr('100.5')).toBeNull()
  })

  it('refuses anything over the cap', () => {
    expect(parseFeeIdr('10000001')).toBeNull()
  })

  it('accepts exactly the cap', () => {
    expect(parseFeeIdr('10000000')).toBe(10_000_000)
  })

  it('refuses empty, missing or non-numeric input', () => {
    expect(parseFeeIdr('')).toBeNull()
    expect(parseFeeIdr(null)).toBeNull()
    expect(parseFeeIdr('abc')).toBeNull()
  })
})

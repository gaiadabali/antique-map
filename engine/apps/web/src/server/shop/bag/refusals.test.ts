/**
 * The bag page's refusal words (TASKS.md 6.2.b, 6.2.d): a pin beyond the last band refuses with
 * the handoff, and no refusal is ever copy in a component.
 */
import { describe, expect, it } from 'vitest'

import { refusalKey } from './refusals'

describe('a pin beyond the last band refuses with the handoff', () => {
  it('maps beyond_reach and no_delivery_table to the WhatsApp handoff keys', () => {
    expect(refusalKey('beyond_reach')).toBe('bag.beyondReach')
    expect(refusalKey('no_delivery_table')).toBe('bag.deliveryUnavailable')
  })

  it('maps the bag-only refusals to the empty and nothing-to-buy keys', () => {
    expect(refusalKey('empty_bag')).toBe('cart.empty')
    expect(refusalKey('out_of_stock')).toBe('bag.bagProblem')
  })
})

/**
 * How an order starts (the plan's K2; TASKS.md 27.3): priced from the bands → `pending_payment`
 * with the fee in its total and the payment window; past the last band, or no table it can trust →
 * `awaiting_quote` with no fee and the quote window. Every figure is `quoteBag`'s, to the rupiah.
 */
import { describe, expect, it } from 'vitest'

import {
  CATALOGUE,
  HUNDRED,
  ODD,
  PLAIN,
  SETTINGS,
  line,
  percent,
} from '../pricing/pricing.test-support'
import { quoteBag, type PricingSettings } from '../pricing/quote'
import { orderStartFor } from './start'

const WINDOWS = { orderExpiryMinutes: 60, quoteWindowMinutes: 120 }

const start = (
  lines: Parameters<typeof quoteBag>[0],
  distanceKm: number,
  discount: Parameters<typeof quoteBag>[3]['discount'] = null,
  settings: PricingSettings = SETTINGS,
) => orderStartFor(quoteBag(lines, CATALOGUE, settings, { distanceKm, discount }), WINDOWS)

describe('an order inside the bands is priced and waits for payment', () => {
  it('one item 3 km away: the first band’s fee, in the total, the payment window', () => {
    expect(start([line(PLAIN, 1)], 3)).toEqual({
      status: 'pending_payment',
      totals: { subtotalIdr: 95_000, discountIdr: 0, deliveryIdr: 15_000, totalIdr: 110_000 },
      windowMinutes: 60,
    })
  })

  it('exactly on a band’s edge is inside it; just past it is the next band', () => {
    expect(start([line(PLAIN, 1)], 5).totals.deliveryIdr).toBe(15_000)
    expect(start([line(PLAIN, 1)], 5.01).totals.deliveryIdr).toBe(25_000)
    expect(start([line(PLAIN, 1)], 20).totals).toMatchObject({ deliveryIdr: 40_000 })
  })

  it('free over the threshold: a fee of 0, still priced, still the payment window', () => {
    expect(start([line(HUNDRED, 5)], 12)).toEqual({
      status: 'pending_payment',
      totals: { subtotalIdr: 500_000, discountIdr: 0, deliveryIdr: 0, totalIdr: 500_000 },
      windowMinutes: 60,
    })
  })

  it('the threshold is measured after the discount: 10% off 500.000 is no longer free', () => {
    expect(start([line(HUNDRED, 5)], 12, percent(10)).totals).toEqual({
      subtotalIdr: 500_000,
      discountIdr: 50_000,
      deliveryIdr: 40_000,
      totalIdr: 490_000,
    })
  })

  it('the welcome code is applied once, to the items only, rounded once', () => {
    // 3 × 12.345 = 37.035; 10% = 3.703,5 → 3.704 (half-up, once); the fee is never discounted.
    expect(start([line(ODD, 3)], 7, percent(10)).totals).toEqual({
      subtotalIdr: 37_035,
      discountIdr: 3_704,
      deliveryIdr: 25_000,
      totalIdr: 37_035 - 3_704 + 25_000,
    })
  })

  it('every figure is a whole rupiah', () => {
    const { totals } = start([line(ODD, 7)], 9.99, percent(15))
    for (const value of Object.values(totals)) expect(Number.isSafeInteger(value)).toBe(true)
  })
})

describe('an order the bands cannot price waits for a staff quote', () => {
  it('beyond the last band: no fee, the items total, the quote window', () => {
    expect(start([line(PLAIN, 2)], 20.01)).toEqual({
      status: 'awaiting_quote',
      totals: { subtotalIdr: 190_000, discountIdr: 0, deliveryIdr: null, totalIdr: 190_000 },
      windowMinutes: 120,
    })
  })

  it('beyond the last band with a code: the discount still counted, still no fee', () => {
    expect(start([line(PLAIN, 2)], 400, percent(10)).totals).toEqual({
      subtotalIdr: 190_000,
      discountIdr: 19_000,
      deliveryIdr: null,
      totalIdr: 171_000,
    })
  })

  it.each([
    ['no bands at all', { bands: [], freeOverIdr: null }],
    [
      'a band with a fractional fee',
      { bands: [{ upToKm: 5, feeIdr: 15_000.5 }], freeOverIdr: null },
    ],
    [
      'bands out of order',
      {
        bands: [
          { upToKm: 10, feeIdr: 25_000 },
          { upToKm: 5, feeIdr: 15_000 },
        ],
        freeOverIdr: null,
      },
    ],
  ])('no table it can trust (%s): a staff quote, never a guessed fee', (_, delivery) => {
    expect(start([line(PLAIN, 1)], 3, null, { delivery })).toEqual({
      status: 'awaiting_quote',
      totals: { subtotalIdr: 95_000, discountIdr: 0, deliveryIdr: null, totalIdr: 95_000 },
      windowMinutes: 120,
    })
  })
})

describe('a quote that cannot be an order is a defect', () => {
  it('an empty bag throws', () => {
    expect(() => start([], 3)).toThrow(/quote of buyable lines failed/)
  })
})

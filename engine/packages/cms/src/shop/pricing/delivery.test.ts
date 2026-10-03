/**
 * The delivery fee (TASKS.md 6.2.b, 6.2.d): bands, the reach, and free delivery switching on exactly
 * at the threshold measured after the discount.
 */
import { describe, expect, it } from 'vitest'

import {
  checkDeliveryTable,
  deliveryFeeFor,
  freeDeliveryRemainingIdr,
  type DeliveryBand,
} from './delivery'
import { CATALOGUE, PLAIN, SETTINGS, line } from './pricing.test-support'
import { quoteBag } from './quote'

const { bands, freeOverIdr } = SETTINGS.delivery
const fee = (distanceKm: number, afterDiscountIdr = 100_000) =>
  deliveryFeeFor(distanceKm, bands, freeOverIdr, afterDiscountIdr)

describe('the band', () => {
  it('is the first whose upToKm reaches the distance; its edge is inside it', () => {
    expect(fee(0)).toMatchObject({ ok: true, feeIdr: 15_000, isFree: false })
    expect(fee(5)).toMatchObject({ ok: true, feeIdr: 15_000 })
    expect(fee(5.1)).toMatchObject({ ok: true, feeIdr: 25_000 })
    expect(fee(10)).toMatchObject({ ok: true, feeIdr: 25_000 })
    expect(fee(20)).toMatchObject({
      ok: true,
      feeIdr: 40_000,
      band: { upToKm: 20, feeIdr: 40_000 },
    })
  })

  it('rounds a distance up to the next 0.1 km, without floating-point drift', () => {
    expect(fee(5.01)).toMatchObject({ feeIdr: 25_000 }) // 5.1 km
    expect(
      deliveryFeeFor(
        2.1,
        [
          { upToKm: 2.1, feeIdr: 1 },
          { upToKm: 3, feeIdr: 2 },
        ],
        null,
        0,
      ),
    ).toMatchObject({
      feeIdr: 1,
    })
    expect(deliveryFeeFor(0.1 + 0.2, [{ upToKm: 0.3, feeIdr: 1 }], null, 0)).toMatchObject({
      feeIdr: 1,
    })
  })

  it('refuses a pin beyond the last band — the page offers WhatsApp', () => {
    expect(fee(20.01)).toEqual({ ok: false, refusal: 'beyond_reach' })
    expect(fee(500, 10_000_000)).toEqual({ ok: false, refusal: 'beyond_reach' })
  })

  it('throws on a distance the server could not have computed', () => {
    for (const d of [-1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => fee(d)).toThrow(RangeError)
    expect(() => deliveryFeeFor(1, bands, freeOverIdr, 1.5)).toThrow(RangeError)
  })
})

describe('a pin beyond the last band refuses with the handoff', () => {
  // The page maps `beyond_reach` to the WhatsApp handoff copy (EXPERIENCE-SHOP.md §6); the core's
  // contract is the refusal itself: no fee, no delivery in the total, nothing to buy into.
  it('the quote refuses with beyond_reach and totals the items only', () => {
    const quote = quoteBag([line(PLAIN, 2)], CATALOGUE, SETTINGS, {
      distanceKm: 20.1,
      discount: null,
    })
    expect(quote).toMatchObject({
      refusal: 'beyond_reach',
      deliveryIdr: null,
      subtotalIdr: 190_000,
      totalIdr: 190_000,
    })
  })

  it('the fee alone refuses, so checkout can offer the handoff before pricing', () => {
    expect(deliveryFeeFor(20.1, bands, freeOverIdr, 190_000)).toEqual({
      ok: false,
      refusal: 'beyond_reach',
    })
  })
})

describe('free delivery switches on exactly at the threshold', () => {
  it('charges at one rupiah under, and is free at the threshold and above', () => {
    expect(fee(3, 499_999)).toMatchObject({ ok: true, feeIdr: 15_000, isFree: false })
    expect(fee(3, 500_000)).toMatchObject({ ok: true, feeIdr: 0, isFree: true })
    expect(fee(19, 500_001)).toMatchObject({ ok: true, feeIdr: 0, isFree: true })
  })

  it('is never free without a threshold, and always free at a threshold of 0', () => {
    expect(deliveryFeeFor(3, bands, null, 10_000_000)).toMatchObject({
      feeIdr: 15_000,
      isFree: false,
    })
    expect(deliveryFeeFor(3, bands, 0, 0)).toMatchObject({ feeIdr: 0, isFree: true })
  })

  it('reports what is left to reach it', () => {
    expect(freeDeliveryRemainingIdr(500_000, 455_000)).toBe(45_000)
    expect(freeDeliveryRemainingIdr(500_000, 500_000)).toBe(0)
    expect(freeDeliveryRemainingIdr(500_000, 900_000)).toBe(0)
    expect(freeDeliveryRemainingIdr(null, 1)).toBeNull()
  })
})

describe('the owner’s table is checked, never guessed at', () => {
  const bad: [string, DeliveryBand[], number | null, string, number | null][] = [
    ['empty', [], 500_000, 'empty', null],
    [
      'unordered',
      [
        { upToKm: 10, feeIdr: 1 },
        { upToKm: 5, feeIdr: 1 },
      ],
      null,
      'order',
      1,
    ],
    [
      'a repeated edge',
      [
        { upToKm: 5, feeIdr: 1 },
        { upToKm: 5, feeIdr: 2 },
      ],
      null,
      'order',
      1,
    ],
    ['a fractional fee', [{ upToKm: 5, feeIdr: 1500.5 }], null, 'fee', 0],
    ['a negative fee', [{ upToKm: 5, feeIdr: -1 }], null, 'fee', 0],
    ['a missing fee', [{ upToKm: 5, feeIdr: Number.NaN }], null, 'fee', 0],
    ['a zero distance', [{ upToKm: 0, feeIdr: 1 }], null, 'distance', 0],
    ['a distance finer than 0.1 km', [{ upToKm: 2.55, feeIdr: 1 }], null, 'distance', 0],
    ['a fractional threshold', [{ upToKm: 5, feeIdr: 1 }], 0.5, 'threshold', null],
  ]

  it.each(bad)('refuses %s', (_name, table, threshold, problem, index) => {
    expect(checkDeliveryTable({ bands: table, freeOverIdr: threshold })).toEqual({
      ok: false,
      problem,
      index,
    })
    expect(deliveryFeeFor(1, table, threshold, 0)).toEqual({
      ok: false,
      refusal: 'no_delivery_table',
    })
  })

  it('accepts the documented table and tenths of a km', () => {
    expect(checkDeliveryTable(SETTINGS.delivery)).toEqual({ ok: true })
    expect(
      checkDeliveryTable({
        bands: [
          { upToKm: 2.5, feeIdr: 0 },
          { upToKm: 7, feeIdr: 9_000 },
        ],
        freeOverIdr: null,
      }),
    ).toEqual({
      ok: true,
    })
  })
})

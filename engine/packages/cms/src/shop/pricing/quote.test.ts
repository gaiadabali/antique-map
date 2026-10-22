/**
 * Pricing a bag (TASKS.md 6.2.a, 6.2.d): totals match hand-computed cases to the rupiah; free
 * delivery switches on exactly at the threshold. Tampering and refusals: `quote.tamper.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import type { BagLine } from './bag'
import type { EligibleDiscount } from './discount'
import {
  CATALOGUE,
  HUNDRED,
  ODD,
  PLAIN,
  PRINT,
  SETTINGS,
  SOLD_OUT,
  fixed,
  line,
  percent,
} from './pricing.test-support'
import { buyableLines, quoteBag, type Catalogue } from './quote'

const quote = (
  lines: BagLine[],
  distanceKm: number | null,
  discount: EligibleDiscount | null = null,
  catalogue: Catalogue = CATALOGUE,
) => quoteBag(lines, catalogue, SETTINGS, { distanceKm, discount })

const totals = (q: ReturnType<typeof quote>) => [
  q.subtotalIdr,
  q.discountIdr,
  q.deliveryIdr,
  q.totalIdr,
]

describe('totals match hand-computed cases to the rupiah', () => {
  it.each([
    // [case, lines, km, discount, [subtotal, discount, delivery, total]]
    ['one plain item, nearest band', [line(PLAIN, 1)], 3, null, [95_000, 0, 15_000, 110_000]],
    // 2 × 95.000 + 185.000 (A2's own price) = 375.000; 7.5 km is the 10 km band
    [
      'a variant with its own price',
      [line(PLAIN, 2), line(PRINT, 1, 'PRINT-A2')],
      7.5,
      null,
      [375_000, 0, 25_000, 400_000],
    ],
    // A3 has no price of its own → the product's 150.000: 3 × 150.000 + 95.000 = 545.000 ≥ 500.000 → free
    [
      'over the threshold: free delivery',
      [line(PRINT, 3, 'PRINT-A3'), line(PLAIN, 1)],
      12,
      null,
      [545_000, 0, 0, 545_000],
    ],
    // 10% of 12.345 = 1.234,5 → half-up → 1.235; 12.345 − 1.235 + 15.000 = 26.110
    ['10% rounds half-up', [line(ODD, 1)], 2, percent(10), [12_345, 1_235, 15_000, 26_110]],
    // 3 × 12.345 = 37.035; 15% = 5.555,25 → 5.555; 10 km is still the 10 km band
    [
      '15% rounds down, at a band edge',
      [line(ODD, 3)],
      10,
      percent(15),
      [37_035, 5_555, 25_000, 56_480],
    ],
    // 600.000 − 150.000 = 450.000 < 500.000 → the threshold is after the discount, so the fee applies
    [
      'a fixed discount drops it under the threshold',
      [line(PRINT, 4, 'PRINT-A3')],
      20,
      fixed(150_000),
      [600_000, 150_000, 40_000, 490_000],
    ],
    // a fixed discount larger than the items is capped at them; delivery is never discounted
    [
      'a fixed discount capped at the subtotal',
      [line(PLAIN, 1)],
      1,
      fixed(200_000),
      [95_000, 95_000, 15_000, 15_000],
    ],
    // the sold-out and inactive lines are shown but not counted
    [
      'out-of-stock and unavailable lines left out',
      [line(PLAIN, 1), line(SOLD_OUT, 2), line(PRINT, 1, 'PRINT-OLD')],
      4,
      null,
      [95_000, 0, 15_000, 110_000],
    ],
    // 25% of 4 × 100.000 + 12.345 = 412.345 → 103.086,25 → 103.086; 309.259 + 25.000
    [
      '25% on a mixed bag',
      [line(HUNDRED, 4), line(ODD, 1)],
      6,
      percent(25),
      [412_345, 103_086, 25_000, 334_259],
    ],
  ] as const)('%s', (_name, lines, km, discount, expected) => {
    expect(totals(quote([...lines], km, discount))).toEqual(expected)
  })

  it('prices each line from the catalogue and says why a line is left out', () => {
    const q = quote(
      [
        line(PLAIN, 2),
        line(SOLD_OUT, 1),
        line(PRINT, 1, 'PRINT-A1'),
        line(PRINT, 1),
        line(PLAIN, 1, 'X'),
        line(99, 1),
      ],
      null,
    )
    expect(q.lines).toEqual([
      {
        productId: PLAIN,
        variantSku: null,
        qty: 2,
        status: 'ok',
        unitIdr: 95_000,
        lineIdr: 190_000,
      },
      {
        productId: SOLD_OUT,
        variantSku: null,
        qty: 1,
        status: 'out_of_stock',
        unitIdr: 42_500,
        lineIdr: 0,
      },
      {
        productId: PRINT,
        variantSku: 'PRINT-A1',
        qty: 1,
        status: 'out_of_stock',
        unitIdr: 240_000,
        lineIdr: 0,
      },
      {
        productId: PRINT,
        variantSku: null,
        qty: 1,
        status: 'unavailable',
        unitIdr: null,
        lineIdr: 0,
      },
      {
        productId: PLAIN,
        variantSku: 'X',
        qty: 1,
        status: 'unavailable',
        unitIdr: null,
        lineIdr: 0,
      },
      { productId: 99, variantSku: null, qty: 1, status: 'unavailable', unitIdr: null, lineIdr: 0 },
    ])
    expect(buyableLines(q)).toEqual([line(PLAIN, 2)])
  })

  it('without a pin, quotes items only and says what is left for free delivery', () => {
    const q = quote([line(PLAIN, 1)], null)
    expect(q).toMatchObject({
      deliveryIdr: null,
      totalIdr: 95_000,
      freeDeliveryRemainingIdr: 405_000,
    })
    expect(q.refusal).toBeUndefined()
  })

  it('records the applied code for the order’s snapshot, and a minimum-spend refusal as a value', () => {
    expect(quote([line(PLAIN, 1)], 3, percent(10)).discount).toEqual({
      code: 'WELCOME',
      kind: 'percent',
      value: 10,
    })
    const short = quote([line(PLAIN, 1)], 3, percent(10, 100_000))
    expect(short).toMatchObject({ discount: null, discountIdr: 0, totalIdr: 110_000 })
    expect(short.discountRefusal).toEqual({
      reason: 'minimum_spend',
      messageKey: 'codeInvalid.minimum-spend',
      amountIdr: 5_000,
    })
  })
})

describe('free delivery switches on exactly at the threshold', () => {
  it('charges at Rp 495.000 and is free at Rp 500.000 of items', () => {
    expect(totals(quote([line(HUNDRED, 4), line(PLAIN, 1)], 3))).toEqual([
      495_000, 0, 15_000, 510_000,
    ])
    expect(quote([line(HUNDRED, 5)], 3)).toMatchObject({
      deliveryIdr: 0,
      isFreeDelivery: true,
      totalIdr: 500_000,
    })
  })

  it('measures after the discount: Rp 500.000 left is free, Rp 499.999 is not', () => {
    expect(quote([line(HUNDRED, 6)], 3, fixed(100_000))).toMatchObject({
      deliveryIdr: 0,
      totalIdr: 500_000,
    })
    expect(quote([line(HUNDRED, 6)], 3, fixed(100_001))).toMatchObject({
      deliveryIdr: 15_000,
      totalIdr: 514_999,
    })
  })
})

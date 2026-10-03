/**
 * Pricing a bag (TASKS.md 6.2.d): a tampered price or quantity in the request is ignored — the
 * catalogue is the only source of a price — and a bag that cannot go to payment says why.
 */
import { describe, expect, it } from 'vitest'

import { createBagCookieKey, parseBag, parseBagLines, serialiseBag, type BagLine } from './bag'
import {
  CATALOGUE,
  PLAIN,
  PRINT,
  SETTINGS,
  SOLD_OUT,
  TEST_KEY_SECRET,
  line,
} from './pricing.test-support'
import { quoteBag, type Catalogue } from './quote'

const quote = (lines: BagLine[], distanceKm: number | null, catalogue: Catalogue = CATALOGUE) =>
  quoteBag(lines, catalogue, SETTINGS, { distanceKm, discount: null })

describe('a tampered price or quantity in the request is ignored', () => {
  const key = createBagCookieKey(TEST_KEY_SECRET)
  const clean = quote([line(PLAIN, 2), line(PRINT, 1, 'PRINT-A2')], 7.5)

  it('a price, line total, fee or total sent beside the ids is never read', () => {
    const tampered = parseBagLines([
      { productId: PLAIN, qty: 2, unitIdr: 1, price: 1, lineIdr: 2, total: 1 },
      {
        productId: PRINT,
        variantSku: 'PRINT-A2',
        qty: 1,
        priceIdr: 1,
        deliveryIdr: 0,
        discountIdr: 999_999,
      },
    ])
    expect(quote(tampered, 7.5)).toEqual(clean)
    expect(clean.totalIdr).toBe(400_000)
  })

  it('a quantity out of range, fractional or disguised prices as the empty bag, never as a number', () => {
    for (const qty of [1000, 11, 0, -2, 2.5, '1e1', '02.0']) {
      const q = quote(parseBagLines([{ productId: PLAIN, qty }]), 3)
      expect(q).toMatchObject({
        subtotalIdr: 0,
        totalIdr: 0,
        deliveryIdr: null,
        refusal: 'empty_bag',
      })
    }
  })

  it('lines handed straight to quoteBag are re-validated, so a bad quantity cannot slip past', () => {
    const smuggled = [{ productId: PLAIN, variantSku: null, qty: 500 }] as BagLine[]
    expect(quote(smuggled, 3)).toMatchObject({ totalIdr: 0, refusal: 'empty_bag' })
  })

  it('a cookie whose quantity was raised under the old signature prices as the empty bag', () => {
    const cookie = serialiseBag([line(PLAIN, 1)], key)
    const [v, , sig] = cookie.split('.')
    const raised = `${v}.${Buffer.from(JSON.stringify([{ productId: PLAIN, qty: 9 }])).toString('base64url')}.${sig}`
    expect(quote(parseBag(raised, key), 3).refusal).toBe('empty_bag')
  })

  it('the catalogue is the only source of price: a price change reprices the same bag', () => {
    const bag = parseBag(serialiseBag([line(PLAIN, 2)], key), key)
    const repriced: Catalogue = new Map(CATALOGUE).set(PLAIN, {
      productId: PLAIN,
      priceIdr: 99_000,
      inStock: true,
      variants: [],
    })
    expect(quote(bag, 3).subtotalIdr).toBe(190_000)
    expect(quote(bag, 3, repriced).subtotalIdr).toBe(198_000)
  })

  it('a catalogue price the server cannot trust makes the line unavailable, never a guess', () => {
    for (const priceIdr of [0, -5, 1.5, Number.NaN]) {
      const broken: Catalogue = new Map([
        [PLAIN, { productId: PLAIN, priceIdr, inStock: true, variants: [] }],
      ])
      expect(quote([line(PLAIN, 1)], 3, broken).lines[0]?.status).toBe('unavailable')
    }
  })
})

describe('the fee comes from the band table, never the request', () => {
  const CLEAN = quote([line(PLAIN, 2)], 7.5)

  it('a fee, a band or an is-free flag sent beside the ids changes nothing', () => {
    const tampered = parseBagLines([
      { productId: PLAIN, qty: 2, deliveryIdr: 0, deliveryFeeIdr: 1, isFreeDelivery: true },
    ])
    expect(quote(tampered, 7.5)).toEqual(CLEAN)
    expect(CLEAN.deliveryIdr).toBe(25_000)
  })

  it('the same bag at another distance is priced by the table, not by what it sent before', () => {
    expect(quote([line(PLAIN, 2)], 12).deliveryIdr).toBe(40_000)
    expect(quote([line(PLAIN, 2)], 5).deliveryIdr).toBe(15_000)
  })

  it('only the owner’s table in site-settings can change the fee', () => {
    const cheaper = quoteBag(
      [line(PLAIN, 2)],
      CATALOGUE,
      {
        delivery: {
          bands: [
            { upToKm: 5, feeIdr: 15_000 },
            { upToKm: 10, feeIdr: 1 },
            { upToKm: 20, feeIdr: 40_000 },
          ],
          freeOverIdr: 500_000,
        },
      },
      { distanceKm: 7.5, discount: null },
    )
    expect(cheaper.deliveryIdr).toBe(1)
  })
})

describe('refusals', () => {
  it('names an empty bag, a bag with nothing to buy, a pin beyond reach and a broken fee table', () => {
    expect(quote([], 3).refusal).toBe('empty_bag')
    expect(quote([line(SOLD_OUT, 1)], 3)).toMatchObject({
      refusal: 'out_of_stock',
      totalIdr: 0,
      deliveryIdr: null,
    })
    expect(quote([line(PLAIN, 1)], 25)).toMatchObject({
      refusal: 'beyond_reach',
      deliveryIdr: null,
      totalIdr: 95_000,
    })
    const broken = quoteBag(
      [line(PLAIN, 1)],
      CATALOGUE,
      { delivery: { bands: [], freeOverIdr: null } },
      { distanceKm: 3, discount: null },
    )
    expect(broken).toMatchObject({ refusal: 'no_delivery_table', deliveryIdr: null })
  })
})

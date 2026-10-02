/**
 * The quote's invariants over many generated bags (TASKS.md 6.2.a). fast-check is not a dependency,
 * so this is a seeded generator: deterministic, so a failure reproduces from its case number.
 *
 * For any bag, discount and distance: total = subtotal − discount + delivery; every amount is a
 * non-negative safe integer; the discount never exceeds the subtotal; delivery is free exactly when
 * subtotal − discount reaches the threshold.
 */
import { describe, expect, it } from 'vitest'

import { MAX_BAG_LINES, MAX_LINE_QTY, type BagLine } from './bag'
import type { EligibleDiscount } from './discount'
import { CATALOGUE, SETTINGS } from './pricing.test-support'
import { quoteBag } from './quote'

/** mulberry32: a tiny, well-mixed 32-bit PRNG. */
function generator(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[out[i], out[j]] = [out[j] as T, out[i] as T]
    }
    return out
  }
  return { int, pick, shuffle }
}

const CHOICES: readonly Omit<BagLine, 'qty'>[] = [
  { productId: 1, variantSku: null },
  { productId: 2, variantSku: 'PRINT-A3' },
  { productId: 2, variantSku: 'PRINT-A2' },
  { productId: 2, variantSku: 'PRINT-OLD' },
  { productId: 2, variantSku: 'PRINT-A1' },
  { productId: 3, variantSku: null },
  { productId: 4, variantSku: null },
  { productId: 5, variantSku: null },
  { productId: 77, variantSku: null },
]

const isIdr = (n: number | null) => n === null || (Number.isSafeInteger(n) && n >= 0)

describe('for any bag', () => {
  it('total = subtotal − discount + delivery, and every amount is a non-negative integer', () => {
    const { int, pick, shuffle } = generator(0x62d)
    for (let n = 0; n < 2_000; n++) {
      const count = int(0, Math.min(CHOICES.length, MAX_BAG_LINES))
      const lines = shuffle(CHOICES)
        .slice(0, count)
        .map((choice) => ({ ...choice, qty: int(1, MAX_LINE_QTY) }))
      const discount: EligibleDiscount | null = pick([
        null,
        {
          code: 'P',
          kind: 'percent',
          value: int(1, 100),
          minSpendIdr: pick([null, int(0, 600_000)]),
          isBuyerChecked: true,
        },
        {
          code: 'F',
          kind: 'fixed',
          value: int(1, 900_000),
          minSpendIdr: pick([null, int(0, 600_000)]),
          isBuyerChecked: true,
        },
      ])
      const distanceKm = pick([null, int(0, 250) / 10])
      const q = quoteBag(lines, CATALOGUE, SETTINGS, { distanceKm, discount })

      const label = `case ${n}`
      expect(q.totalIdr, label).toBe(q.subtotalIdr - q.discountIdr + (q.deliveryIdr ?? 0))
      for (const amount of [
        q.subtotalIdr,
        q.discountIdr,
        q.deliveryIdr,
        q.totalIdr,
        q.freeDeliveryRemainingIdr,
      ]) {
        expect(isIdr(amount), `${label}: ${amount}`).toBe(true)
      }
      for (const quoted of q.lines)
        expect(isIdr(quoted.lineIdr) && isIdr(quoted.unitIdr), label).toBe(true)
      expect(q.discountIdr, label).toBeLessThanOrEqual(q.subtotalIdr)
      expect(q.subtotalIdr, label).toBe(q.lines.reduce((sum, l) => sum + l.lineIdr, 0))
      if (q.deliveryIdr !== null) {
        const freeOver = SETTINGS.delivery.freeOverIdr as number
        expect(q.isFreeDelivery, label).toBe(q.subtotalIdr - q.discountIdr >= freeOver)
        expect(q.deliveryIdr === 0, label).toBe(q.isFreeDelivery)
      }
    }
  })
})

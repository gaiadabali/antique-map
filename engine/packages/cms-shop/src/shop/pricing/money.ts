/**
 * Rupiah as the pricing core handles it (COMMERCE.md §2; CONVENTIONS.md §5): a safe integer of
 * minor units, the minor unit being one rupiah. Nothing in `shop/pricing` holds a float amount, and
 * exactly one function here may produce a fraction before rounding it away: `percentOfHalfUp`.
 */

/** A non-negative safe integer of rupiah: `95000` is Rp 95.000. */
export function isIdr(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** A price a line can be sold at: a positive safe integer (CONTENT-MODEL.md §8, price > 0). */
export function isPriceIdr(value: unknown): value is number {
  return isIdr(value) && value > 0
}

/**
 * Asserts an amount the pricing core computed. A failure is a defect (an overflow, a bad sum), never
 * a visitor's input — inputs are refused as values before they reach arithmetic.
 */
export function assertIdr(value: number, what: string): number {
  if (!isIdr(value))
    throw new RangeError(`${what} is not a non-negative safe integer of rupiah: ${value}`)
  return value
}

/**
 * THE one rounding step of the shop (COMMERCE.md §2): `percent`% of `amountIdr`, rounded half-up to
 * the whole rupiah. Computed in `bigint`, so `amountIdr × percent` can never lose precision on the
 * way: Rp 12.345 at 10% is 1234.5 → Rp 1.235; Rp 12.344 at 10% is 1234.4 → Rp 1.234.
 */
export function percentOfHalfUp(amountIdr: number, percent: number): number {
  assertIdr(amountIdr, 'amount')
  if (!Number.isSafeInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`percent must be a whole number from 0 to 100: ${percent}`)
  }
  return Number((BigInt(amountIdr) * BigInt(percent) + 50n) / 100n)
}

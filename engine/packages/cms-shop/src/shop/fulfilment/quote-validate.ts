/**
 * The admin "Send price" input's own validation (TASKS.md 6.6.c), ahead of the core's own
 * (`quoteDeliveryFee`): read by `./staff-routes`' quote handler, and unit-tested on its own
 * (`quote-validate.test.ts`). Moved from today's app with the handlers (TASKS.md 23.4).
 */

/** A whole rupiah amount, 0 (free) up to the core's own cap (`6.6-core` step 5) — `null` otherwise. */
export function parseFeeIdr(value: unknown): number | null {
  if (typeof value !== 'string' || value === '') return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000 ? n : null
}

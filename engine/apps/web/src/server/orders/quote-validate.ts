/**
 * The admin "Send price" input's own validation (TASKS.md 6.6.c) — no `server-only`, unlike
 * `quote.ts`, so this pure check can be unit-tested directly (`quote-validate.test.ts`) without
 * pulling in Next's server-component boundary.
 */

/** A whole rupiah amount, 0 (free) up to the core's own cap (`6.6-core` step 5) — `null` otherwise. */
export function parseFeeIdr(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value === '') return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000 ? n : null
}

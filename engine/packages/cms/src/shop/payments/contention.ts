/**
 * Lock contention, recognised (TASKS.md 10.5): free of Payload and drizzle, so the webhook handler
 * (`./http/webhook`) can tell it from a defect without loading the database at import.
 */

/**
 * SQLSTATEs that mean another transaction holds what this one needs: `lock_not_available` (55P03 —
 * NOWAIT, and `lock_timeout` expiring) and `deadlock_detected` (40P01). Rolled back, either is safe
 * to retry; neither is a defect.
 */
const CONTENTION_CODES = new Set(['55P03', '40P01'])

/**
 * True when `error` — or what it wraps (drizzle's `DrizzleQueryError` keeps pg's error as `cause`)
 * — is lock contention rather than a defect.
 */
export function isLockContention(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown }
    if (typeof code === 'string' && CONTENTION_CODES.has(code)) return true
    current = cause
  }
  return false
}

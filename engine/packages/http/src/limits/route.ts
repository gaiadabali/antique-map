/**
 * `@engine/http/limits`: the per-address limits every app keeps in-process (SECURITY.md §2.10) — the
 * table, the limiter, the proxy's sign-in and password-reset guard (`withRateLimits`), the
 * checkout's and the delivery preview's waits, and the bounded map they and the lead and tracking
 * limits keep their keys in. Here, beside the proxy, so each app's `proxy.ts` wraps itself with them
 * (TASKS.md 23.4); `@engine/site/limits` re-exports it for the pages' actions. Nothing here reads a
 * database or a file: the proxy may load it.
 */
export * from './bounded-map'
export * from './guard'
export * from './rate-limit'

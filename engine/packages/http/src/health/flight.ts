/**
 * The two ways `/api/health` keeps its cost to the database bounded (4.1 senior-be #5; the
 * independent 4.8 review, S3). The route is public and unauthenticated, and it shares the pool the
 * page loaders use, so a burst of checks must not become a burst of queries — and a query that
 * never answers must not strand one pool client per check.
 *
 * - `memoised(run, ttlMs)` — one run at a time, its answer reused for `ttlMs` after it settles:
 *   every check inside the window, and every one that arrives while a run is in flight, gets that
 *   run's answer. One web process per brand (DEPLOYMENT.md §3) makes the window exact.
 * - `bounded(start, timeoutMs)` — a query that answers within `timeoutMs` or is reported as not
 *   answering, and that is never started again while the last one is still pending: a check that
 *   timed out leaves its query running, and the next check waits on that same query instead of
 *   opening another.
 */

type Clock = () => number

/** `run`, at most once at a time, its settled answer reused for `ttlMs`. A rejection is not kept. */
export function memoised<T>(
  run: () => Promise<T>,
  ttlMs: number,
  now: Clock = Date.now,
): () => Promise<T> {
  let inFlight: Promise<T> | null = null
  let kept: { readonly value: T; readonly at: number } | null = null
  return () => {
    if (kept !== null && now() - kept.at < ttlMs) return Promise.resolve(kept.value)
    if (inFlight !== null) return inFlight
    const started = run().then(
      (value) => {
        kept = { value, at: now() }
        inFlight = null
        return value
      },
      (error: unknown) => {
        inFlight = null
        throw error
      },
    )
    inFlight = started
    return started
  }
}

/** Thrown when a bounded query has not answered in time; the query itself carries on. */
export class NotAnsweredError extends Error {
  constructor(what: string, timeoutMs: number) {
    super(`${what} did not answer within ${timeoutMs} ms`)
    this.name = 'NotAnsweredError'
  }
}

/**
 * `start()`'s answer within `timeoutMs`, else a `NotAnsweredError`. While a started query is still
 * pending — one that timed out included — a later call awaits that same query rather than start
 * another, so a database that hangs holds one query, never one per check.
 */
export function bounded<T>(
  what: string,
  start: () => Promise<T>,
  timeoutMs: number,
): () => Promise<T> {
  let pending: Promise<T> | null = null
  return async () => {
    if (pending === null) {
      const query = start()
      pending = query
      const clear = () => {
        if (pending === query) pending = null
      }
      query.then(clear, clear)
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new NotAnsweredError(what, timeoutMs)), timeoutMs)
      timer.unref?.()
    })
    try {
      return await Promise.race([pending, late])
    } finally {
      clearTimeout(timer)
    }
  }
}

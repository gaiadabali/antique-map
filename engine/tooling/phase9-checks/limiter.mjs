// The shared rate limiter for the phase-9 checks (TASKS.md 9.3.d, 9.4.c). Staging is shared with
// other clients on one host, so the checks crawl gently: at most `rate` request starts a second
// across the whole run, and one request in flight per host. Both the clock and the sleep are
// injected so a test can drive it with a fake clock and prove the pacing.
export const DEFAULT_RATE = 5
export const MAX_RATE = 5

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The delay to honour from a `Retry-After` header (seconds or an HTTP date), capped. */
export function retryAfterMs(header, now = Date.now, capMs = 30_000) {
  if (!header) return null
  const text = String(header).trim()
  if (/^\d+$/.test(text)) return Math.min(Number(text) * 1000, capMs)
  const date = Date.parse(text)
  if (Number.isNaN(date)) return null
  return Math.min(Math.max(date - now(), 0), capMs)
}

/**
 * `createLimiter({ rate, now, sleep })` → `{ run(host, task), intervalMs }`. `run` serialises
 * `task`s per host and gates every start through one global interval, so the whole crawl never
 * exceeds `rate` requests a second however many hosts it touches. `task` receives the granted start
 * time (of the injected clock) as its argument.
 */
export function createLimiter({ rate = DEFAULT_RATE, now = Date.now, sleep = defaultSleep } = {}) {
  const intervalMs = 1000 / rate
  let nextStart = 0
  const tails = new Map()

  async function gate() {
    const at = now()
    const start = Math.max(at, nextStart)
    nextStart = start + intervalMs
    if (start > at) await sleep(start - at)
    return start
  }

  function run(host, task) {
    const previous = tails.get(host) ?? Promise.resolve()
    const attempt = async () => {
      const start = await gate()
      return task(start)
    }
    const result = previous.then(attempt, attempt)
    tails.set(
      host,
      result.then(
        () => {},
        () => {},
      ),
    )
    return result
  }

  return { run, intervalMs }
}

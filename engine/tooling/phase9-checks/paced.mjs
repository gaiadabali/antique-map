// The paced, backed-off GET both checks share: every request goes through the limiter, and a 429 or
// a 503 is retried a few times, waiting what `Retry-After` says (or a second). A GET only — the
// checks never send a body, a cookie or a signed-in request.
import { requestOnce } from './http.mjs'
import { retryAfterMs } from './limiter.mjs'

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * `createGet({ limiter, host })` → `async (url) => { status, headers, url, body }`. Retries 429/503
 * up to `retries` times; waits `Retry-After` when the answer carries one.
 */
export function createGet({ limiter, host, retries = 3, get = requestOnce, sleep = realSleep }) {
  async function attempt(url, left) {
    const res = await limiter.run(new URL(url).host, () => get(url, { method: 'GET', host }))
    if ((res.status === 429 || res.status === 503) && left > 0) {
      await sleep(retryAfterMs(res.headers?.['retry-after']) ?? 1000)
      return attempt(url, left - 1)
    }
    return res
  }
  return (url) => attempt(url, retries)
}

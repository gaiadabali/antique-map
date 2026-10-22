// The backed-off GET (ticket: "Retry-After is honoured"). A 429 then a 200 must wait the header's
// delay; the retry is a fresh request, not a cached answer.
import { describe, expect, it } from 'vitest'

import { createGet } from './paced.mjs'
import { createLimiter } from './limiter.mjs'
import { startServer } from './support/server.mjs'

const noWait = { rate: 1000, now: () => 0, sleep: () => Promise.resolve() }

describe('createGet', () => {
  it('retries a 429 and eventually answers the 200', async () => {
    let calls = 0
    const server = await startServer({
      '/flaky': () => {
        calls += 1
        return calls === 1
          ? { status: 429, headers: { 'retry-after': '1' }, body: '' }
          : { status: 200, body: 'ok' }
      },
    })
    try {
      const sleeps = []
      const get = createGet({
        limiter: createLimiter(noWait),
        host: undefined,
        sleep: (ms) => {
          sleeps.push(ms)
          return Promise.resolve()
        },
      })
      const res = await get(`${server.base}/flaky`)
      expect(res.status).toBe(200)
      expect(sleeps).toContain(1000)
    } finally {
      await server.close()
    }
  })

  it('does not retry an ordinary 404', async () => {
    let calls = 0
    const server = await startServer({
      '/x': () => {
        calls += 1
        return { status: 404, body: '' }
      },
    })
    try {
      const get = createGet({ limiter: createLimiter(noWait) })
      const res = await get(`${server.base}/x`)
      expect(res.status).toBe(404)
      expect(calls).toBe(1)
    } finally {
      await server.close()
    }
  })
})

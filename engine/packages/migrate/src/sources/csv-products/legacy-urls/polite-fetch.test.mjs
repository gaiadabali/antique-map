import { describe, expect, it } from 'vitest'

import { CDX_HOST } from './cdx.mjs'
import { createPoliteFetch } from './polite-fetch.mjs'

/** A fake clock and fetch: sleeping advances time, each call returns the next scripted response. */
function harness(
  /** @type {Array<{ status: number, body?: string, headers?: Record<string, string> }>} */ script,
) {
  let clock = 0
  const sleeps = /** @type {number[]} */ ([])
  const starts = /** @type {number[]} */ ([])
  const fetchImpl = /** @type {typeof globalThis.fetch} */ (
    async () => {
      starts.push(clock)
      const next = script.shift() ?? { status: 200, body: '[]' }
      return new globalThis.Response(next.body ?? '', {
        status: next.status,
        headers: next.headers,
      })
    }
  )
  const options = {
    allowedHosts: [CDX_HOST],
    userAgent: 'test',
    fetchImpl,
    now: () => clock,
    sleepImpl: async (/** @type {number} */ ms) => {
      sleeps.push(ms)
      clock += ms
    },
  }
  return { options, sleeps, starts }
}

describe('createPoliteFetch', () => {
  it('refuses an interval under one second', () => {
    const { options } = harness([])
    expect(() => createPoliteFetch({ ...options, minIntervalMs: 999 })).toThrow(/floor/)
  })

  it('leaves at least the interval between the starts of two requests', async () => {
    const { options, starts } = harness([])
    const polite = createPoliteFetch({ ...options, minIntervalMs: 1500 })
    for (let i = 0; i < 4; i += 1)
      await polite.getText(`https://${CDX_HOST}/cdx/search/cdx?page=${i}`)
    const gaps = starts.slice(1).map((start, i) => start - (starts[i] ?? 0))
    expect(gaps).toEqual([1500, 1500, 1500])
    expect(polite.requests).toHaveLength(4)
  })

  it('never requests a host other than the archive — the old site cannot be asked', async () => {
    const { options, starts } = harness([])
    const polite = createPoliteFetch(options)
    await expect(polite.getText('https://www.example-shop.test/')).rejects.toThrow(
      /not an allowed host/,
    )
    expect(starts).toHaveLength(0)
    expect(polite.requests).toHaveLength(0)
  })

  it('backs off on 429, honouring Retry-After, then succeeds', async () => {
    const { options, sleeps } = harness([
      { status: 429, headers: { 'retry-after': '30' } },
      { status: 503 },
      { status: 200, body: 'ok' },
    ])
    const polite = createPoliteFetch(options)
    await expect(polite.getText(`https://${CDX_HOST}/cdx/search/cdx`)).resolves.toBe('ok')
    expect(sleeps).toContain(30_000) // Retry-After beat the 10 s first backoff
    expect(sleeps).toContain(20_000) // the second backoff
    expect(polite.requests).toHaveLength(3)
  })

  it('gives up on a non-retryable status, and after the last attempt', async () => {
    const notFound = harness([{ status: 404 }])
    await expect(
      createPoliteFetch(notFound.options).getText(`https://${CDX_HOST}/x`),
    ).rejects.toThrow(/HTTP 404/)
    const busy = harness([{ status: 503 }, { status: 503 }])
    await expect(
      createPoliteFetch({ ...busy.options, maxAttempts: 2 }).getText(`https://${CDX_HOST}/x`),
    ).rejects.toThrow(/HTTP 503/)
  })

  it('follows a redirect only while it stays on the archive', async () => {
    const onArchive = harness([
      {
        status: 302,
        headers: { location: '/web/20240624134229id_/https://www.example-shop.test/x' },
      },
      { status: 200, body: 'moved' },
    ])
    const polite = createPoliteFetch(onArchive.options)
    await expect(polite.getText(`https://${CDX_HOST}/web/20240624134228id_/x`)).resolves.toBe(
      'moved',
    )
    expect(polite.requests[1]).toBe(
      `https://${CDX_HOST}/web/20240624134229id_/https://www.example-shop.test/x`,
    )

    const offArchive = harness([
      { status: 302, headers: { location: 'https://www.example-shop.test/x' } },
    ])
    const refused = createPoliteFetch(offArchive.options)
    await expect(refused.getText(`https://${CDX_HOST}/web/1id_/x`)).rejects.toThrow(
      /not an allowed host/,
    )
    expect(offArchive.starts).toHaveLength(1) // the old site was never asked
  })
})

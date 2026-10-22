// D41's rules, asserted on the timeline the fetcher kept: GET only, an honest
// User-Agent, one request at a time at least two seconds apart, robots.txt
// and the never-list obeyed, back-off on 429/5xx, a stop when the site keeps
// failing or refusing, and never the same URL twice.
import { describe, expect, it } from 'vitest'

import { ReadAborted } from '../polite-fetch.ts'
import { ORIGIN, newFetcher, testConfig } from './helpers.ts'

const ROBOTS = { status: 200, type: 'text/plain', body: 'User-agent: *\nDisallow: /private\n' }

describe('the polite fetcher', () => {
  it('asks robots.txt first, sends only GETs with the configured User-Agent, and no cookies', async () => {
    const { fetcher, requests } = newFetcher({
      '/robots.txt': ROBOTS,
      '/': { status: 200, body: 'home' },
    })
    await fetcher.init()
    await fetcher.get(`${ORIGIN}/`)
    expect(requests.map((request) => request.url)).toEqual(['/robots.txt', '/'])
    for (const request of requests) {
      expect(request.method).toBe('GET')
      expect(request.headers['User-Agent']).toBe('TestReader/1.0 (unit tests)')
      expect(Object.keys(request.headers).map((key) => key.toLowerCase())).not.toContain('cookie')
    }
  })

  it('leaves at least minIntervalMs between the end of one answer and the next request', async () => {
    const routes = {
      '/robots.txt': ROBOTS,
      '/a': { status: 200 },
      '/b': { status: 200 },
      '/c': { status: 200 },
    }
    const { fetcher, requests } = newFetcher(routes)
    await fetcher.init()
    for (const path of ['/a', '/b', '/c']) await fetcher.get(`${ORIGIN}${path}`)
    const gaps = requests.slice(1).map((request, index) => request.at - (requests[index]?.at ?? 0))
    // each answer takes 150 ms on the fake clock, so a gap is 2000 + 150
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(2000 + 150)
  })

  it('refuses a config faster than one request every two seconds, or a browser User-Agent', () => {
    expect(() => testConfig({ minIntervalMs: 1999 })).toThrow(/may not be below 2000/)
    expect(() => testConfig({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toThrow(/browser/)
    expect(() => testConfig({ baseUrl: `${ORIGIN}/shop` })).toThrow(/origin/)
  })

  it('honours a slower Crawl-delay and never a faster one', async () => {
    const slow = { status: 200, type: 'text/plain', body: 'User-agent: *\nCrawl-delay: 5\n' }
    const { fetcher } = newFetcher({ '/robots.txt': slow })
    await fetcher.init()
    expect(fetcher.currentIntervalMs).toBe(5000)
    const fast = { status: 200, type: 'text/plain', body: 'User-agent: *\nCrawl-delay: 1\n' }
    const other = newFetcher({ '/robots.txt': fast })
    await other.fetcher.init()
    expect(other.fetcher.currentIntervalMs).toBe(2000)
  })

  it('skips what robots.txt disallows, the never-list and other origins without a request', async () => {
    const { fetcher, requests } = newFetcher({ '/robots.txt': ROBOTS })
    await fetcher.init()
    expect(await fetcher.get(`${ORIGIN}/private/page`)).toEqual({
      kind: 'skipped',
      reason: 'robots',
    })
    expect(await fetcher.get(`${ORIGIN}/account/basket`)).toEqual({
      kind: 'skipped',
      reason: 'never',
    })
    expect(await fetcher.get(`${ORIGIN}/s?q=bali`)).toEqual({ kind: 'skipped', reason: 'never' })
    expect(await fetcher.get('https://elsewhere.example/')).toEqual({
      kind: 'skipped',
      reason: 'offsite',
    })
    expect(requests).toHaveLength(1) // robots.txt only
  })

  it('treats an unreachable robots.txt (5xx) as disallowing everything', async () => {
    const { fetcher, requests } = newFetcher(
      { '/robots.txt': { status: 503 } },
      { config: testConfig({ maxAttempts: 1, maxConsecutiveFailures: 5 }) },
    )
    await fetcher.init()
    expect(await fetcher.get(`${ORIGIN}/`)).toEqual({ kind: 'skipped', reason: 'robots' })
    expect(requests).toHaveLength(1)
  })

  it('never requests a URL twice: a second fetcher on the same cache answers from disk', async () => {
    const routes = { '/robots.txt': ROBOTS, '/a': { status: 200, body: 'page a' } }
    const first = newFetcher(routes)
    await first.fetcher.init()
    await first.fetcher.get(`${ORIGIN}/a`)
    const second = newFetcher(routes, { cacheDir: first.cacheDir })
    await second.fetcher.init()
    const outcome = await second.fetcher.get(`${ORIGIN}/a`)
    expect(outcome.kind === 'response' && outcome.fromCache).toBe(true)
    expect(second.requests).toHaveLength(0)
  })

  it('offline, answers from the cache alone and fails an uncached URL at once', async () => {
    const online = newFetcher({ '/robots.txt': ROBOTS })
    await online.fetcher.init()
    const { fetcher, requests } = newFetcher({}, { cacheDir: online.cacheDir, offline: true })
    await fetcher.init()
    const outcome = await fetcher.get(`${ORIGIN}/never-fetched`)
    expect(outcome).toMatchObject({ kind: 'failed', message: expect.stringMatching(/^offline/) })
    expect(requests).toHaveLength(0)
    // with no robots.txt in the cache, offline reads nothing at all
    const bare = newFetcher({}, { offline: true })
    await bare.fetcher.init()
    expect(await bare.fetcher.get(`${ORIGIN}/`)).toEqual({ kind: 'skipped', reason: 'robots' })
  })

  it('backs off on 429 as Retry-After asks, then doubles its interval for the rest of the run', async () => {
    const routes = {
      '/robots.txt': ROBOTS,
      '/busy': [
        { status: 429, headers: { 'retry-after': '120' } },
        { status: 200, body: 'ok' },
      ],
    }
    const { fetcher, clock, requests } = newFetcher(routes)
    await fetcher.init()
    const outcome = await fetcher.get(`${ORIGIN}/busy`)
    expect(outcome.kind).toBe('response')
    expect(clock.sleeps).toContain(120_000)
    expect(fetcher.currentIntervalMs).toBe(4000)
    expect(requests.filter((request) => request.url === '/busy')).toHaveLength(2)
  })

  it('backs off exponentially on 5xx and records a failure without caching it', async () => {
    const routes = { '/robots.txt': ROBOTS, '/down': { status: 502 } }
    const { fetcher, clock, cache } = newFetcher(routes, {
      config: testConfig({ maxAttempts: 3, maxConsecutiveFailures: 5 }),
    })
    await fetcher.init()
    expect(await fetcher.get(`${ORIGIN}/down`)).toMatchObject({ kind: 'failed', status: 502 })
    expect(clock.sleeps.filter((ms) => ms >= 10_000)).toEqual([10_000, 20_000])
    expect(cache.has(`${ORIGIN}/down`)).toBe(false) // a later run tries again
  })

  it('stops the whole read after consecutive failures, and after a run of 403s', async () => {
    const failing = newFetcher(
      { '/robots.txt': ROBOTS, '/x': { status: 500 }, '/y': { status: 500 } },
      { config: testConfig({ maxAttempts: 1, maxConsecutiveFailures: 2 }) },
    )
    await failing.fetcher.init()
    await failing.fetcher.get(`${ORIGIN}/x`)
    await expect(failing.fetcher.get(`${ORIGIN}/y`)).rejects.toBeInstanceOf(ReadAborted)

    const routes: Record<string, { status: number }> = { '/robots.txt': ROBOTS }
    for (let index = 0; index < 5; index += 1) routes[`/f${index}`] = { status: 403 }
    const refused = newFetcher(routes)
    await refused.fetcher.init()
    for (let index = 0; index < 4; index += 1) await refused.fetcher.get(`${ORIGIN}/f${index}`)
    await expect(refused.fetcher.get(`${ORIGIN}/f4`)).rejects.toThrow(/403/)
  })

  it('keeps a body only for 2xx: an error page is recorded by status alone', async () => {
    const routes = {
      '/robots.txt': ROBOTS,
      '/gone': { status: 404, body: 'framework debug output that must not be kept' },
      '/moved': { status: 301, headers: { location: `${ORIGIN}/new` } },
    }
    const { fetcher, cache } = newFetcher(routes)
    await fetcher.init()
    const gone = await fetcher.get(`${ORIGIN}/gone`)
    expect(gone.kind === 'response' && gone.entry.body).toBeNull()
    const moved = await fetcher.get(`${ORIGIN}/moved`)
    expect(moved.kind === 'response' && moved.entry.location).toBe(`${ORIGIN}/new`)
    expect(cache.get(`${ORIGIN}/gone`)?.status).toBe(404)
  })
})

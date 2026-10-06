// The 9.4.c judgement against a local server (ticket's test list): a 301 to a 200 passes; a 301 to a
// 301 is a chain failure; a 404 passes only when the builder lists it unresolved, with its reason;
// a 301 to the canonical origin is followed through the base; a 302 is a failure for 9.4.c; a
// redirect off-site fails.
import { afterEach, describe, expect, it } from 'vitest'

import { checkKeys, judgeKey, reconciliation } from './old-urls-check.mjs'
import { requestOnce } from './http.mjs'
import { startServer } from './support/server.mjs'

let server
afterEach(async () => {
  if (server) await server.close()
  server = undefined
})

const get = (url) => requestOnce(url, { method: 'GET' })

const ORIGIN = 'https://gallery.example'

describe('judgeKey', () => {
  it('passes a 301 to a 200', async () => {
    server = await startServer({
      '/old': () => ({ status: 301, headers: { location: '/new' } }),
      '/new': () => ({ status: 200, body: 'ok' }),
    })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {} })
    expect(result.kind).toBe('redirected')
    expect(result.to).toBe(`${server.base}/new`)
  })

  it('fails a 301 to a 301 as a chain', async () => {
    server = await startServer({
      '/old': () => ({ status: 301, headers: { location: '/mid' } }),
      '/mid': () => ({ status: 301, headers: { location: '/new' } }),
      '/new': () => ({ status: 200, body: 'ok' }),
    })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {} })
    expect(result.kind).toBe('fail')
    expect(result.reason).toMatch(/chain/)
  })

  it('fails a 301 whose target is a 404', async () => {
    server = await startServer({ '/old': () => ({ status: 301, headers: { location: '/gone' } }) })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {} })
    expect(result.kind).toBe('fail')
    expect(result.reason).toMatch(/target answers 404/)
  })

  it('passes a 200 as itself', async () => {
    server = await startServer({ '/a': () => ({ status: 200, body: 'ok' }) })
    const result = await judgeKey(server.base, '/a', { get, unresolved: {} })
    expect(result.kind).toBe('ok')
  })

  it('passes a 410 as gone', async () => {
    server = await startServer({ '/a': () => ({ status: 410, body: '' }) })
    expect((await judgeKey(server.base, '/a', { get, unresolved: {} })).kind).toBe('gone')
  })

  it('passes a 404 the builder lists unresolved, carrying its reason', async () => {
    server = await startServer({ '/unmapped': () => ({ status: 404, body: '' }) })
    const unresolved = { '/unmapped': 'no mapping for category 7' }
    const result = await judgeKey(server.base, '/unmapped', { get, unresolved })
    expect(result.kind).toBe('unresolved')
    expect(result.reason).toBe('no mapping for category 7')
  })

  it('fails a 404 the builder does not list', async () => {
    server = await startServer({ '/unmapped': () => ({ status: 404, body: '' }) })
    expect((await judgeKey(server.base, '/unmapped', { get, unresolved: {} })).kind).toBe('fail')
  })

  it('follows a 301 to the canonical origin through the base', async () => {
    server = await startServer({
      '/old': () => ({ status: 301, headers: { location: `${ORIGIN}/new` } }),
      '/new': () => ({ status: 200, body: 'ok' }),
    })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {}, origin: ORIGIN })
    expect(result.kind).toBe('redirected')
    expect(result.to).toBe(`${ORIGIN}/new`)
    expect(server.hits.map((h) => h.path)).toEqual(['/old', '/new'])
  })

  it('fails a redirect that points off-site', async () => {
    server = await startServer({
      '/old': () => ({ status: 301, headers: { location: 'https://evil.example/new' } }),
    })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {}, origin: ORIGIN })
    expect(result.kind).toBe('fail')
    expect(result.reason).toBe('redirects off-site')
    expect(server.hits.map((h) => h.path)).toEqual(['/old'])
  })

  it('fails a 302 for the 9.4.c Check', async () => {
    server = await startServer({ '/old': () => ({ status: 302, headers: { location: '/new' } }) })
    const result = await judgeKey(server.base, '/old', { get, unresolved: {}, origin: ORIGIN })
    expect(result.kind).toBe('fail')
    expect(result.status).toBe(302)
    expect(result.reason).toMatch(/expected 301/)
  })

  it('fails a 307 for the 9.4.c Check', async () => {
    server = await startServer({ '/old': () => ({ status: 307, headers: { location: '/new' } }) })
    expect(
      (await judgeKey(server.base, '/old', { get, unresolved: {}, origin: ORIGIN })).kind,
    ).toBe('fail')
  })

  it('counts a 308 that only normalises a trailing slash as normalised', async () => {
    server = await startServer({
      '/new': () => ({ status: 308, headers: { location: '/new/' } }),
    })
    const result = await judgeKey(server.base, '/new', { get, unresolved: {}, origin: ORIGIN })
    expect(result.kind).toBe('normalised')
  })

  it('fails a 308 to a different path', async () => {
    server = await startServer({
      '/old': () => ({ status: 308, headers: { location: '/elsewhere' } }),
    })
    expect(
      (await judgeKey(server.base, '/old', { get, unresolved: {}, origin: ORIGIN })).kind,
    ).toBe('fail')
  })

  it('counts 301 separately from 302, 307 and 308', async () => {
    server = await startServer({
      '/a': () => ({ status: 301, headers: { location: '/ok' } }),
      '/b': () => ({ status: 302, headers: { location: '/ok' } }),
      '/new': () => ({ status: 308, headers: { location: '/new/' } }),
      '/ok': () => ({ status: 200, body: 'ok' }),
    })
    const { counts } = await checkKeys(server.base, ['/a', '/b', '/new'], {
      get,
      unresolved: {},
      origin: ORIGIN,
    })
    expect(counts.statuses).toEqual({ 301: 1, 302: 1, 307: 0, 308: 1 })
    expect(counts.redirected).toBe(1)
    expect(counts.normalised).toBe(1)
    expect(counts.fail).toBe(1)
  })
})

describe('checkKeys', () => {
  it('tallies every outcome and reconsiles rows + gone + unresolved with N', async () => {
    server = await startServer({
      '/ok': () => ({ status: 200, body: 'ok' }),
      '/old': () => ({ status: 301, headers: { location: '/ok' } }),
      '/gone': () => ({ status: 410, body: '' }),
      '/unmapped': () => ({ status: 404, body: '' }),
    })
    const keys = ['/ok', '/old', '/gone', '/unmapped']
    const seen = []
    const { counts, failures } = await checkKeys(server.base, keys, {
      get,
      unresolved: { '/unmapped': 'no work for legacy id 9' },
      onResult: (url, outcome) => seen.push([url, outcome.kind]),
    })
    expect(counts).toMatchObject({ ok: 1, redirected: 1, gone: 1, unresolved: 1, fail: 0 })
    expect(failures).toEqual([])
    expect(seen).toHaveLength(4)
    const recon = reconciliation(keys.length, counts)
    expect(recon).toMatchObject({ rows: 2, gone: 1, unresolved: 1, sum: 4, matches: true })
  })
})

// The 9.4.c judgement against a local server (ticket's test list): a 301 to a 200 passes; a 301 to a
// 301 is a chain failure; a 404 passes only when the builder lists it unresolved, with its reason.
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

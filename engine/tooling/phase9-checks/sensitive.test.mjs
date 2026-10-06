// Sensitive paths are never requested (ticket: "a sensitive path is never requested"). The check
// drops them before anything is fetched, so the server sees no hit for them.
import { describe, expect, it } from 'vitest'

import { checkKeys } from './old-urls-check.mjs'
import { requestOnce } from './http.mjs'
import { collectKeys } from './normalise.mjs'
import { isSensitive } from './sensitive.mjs'
import { startServer } from './support/server.mjs'

const get = (url) => requestOnce(url, { method: 'GET' })

describe('isSensitive', () => {
  it('marks the ticket’s prefixes and the admin/api surfaces', () => {
    for (const path of [
      '/track',
      '/track/abc123',
      '/lacak/abc123',
      '/order/xyz',
      '/pesanan/xyz',
      '/admin',
      '/api/x/collect',
    ]) {
      expect(isSensitive(path), path).toBe(true)
    }
  })

  it('leaves an ordinary page alone', () => {
    for (const path of ['/', '/about-us', '/product/1706-bali', '/browse', '/trackers']) {
      expect(isSensitive(path), path).toBe(false)
    }
  })
})

describe('collectKeys', () => {
  it('drops a sensitive row and counts it, never putting it in the key list', () => {
    const rows = [
      { path: '/', status: '200' },
      { path: '/track/secret-token', status: '200' },
      { path: '/order/abc', status: '200' },
      { path: '/about-us', status: '200' },
    ]
    const { keys, skippedSensitive } = collectKeys('shop', rows)
    expect(skippedSensitive).toBe(2)
    expect(keys).toEqual(['/', '/about-us'])
  })
})

describe('a sensitive path is never requested', () => {
  it('the sweep makes no request for a dropped key', async () => {
    const server = await startServer({
      '/': () => ({ status: 200, body: 'ok' }),
      '/track/secret-token': () => ({ status: 200, body: 'ok' }),
    })
    try {
      const rows = [
        { path: '/track/secret-token', status: '200' },
        { path: '/', status: '200' },
      ]
      const { keys, skippedSensitive } = collectKeys('shop', rows)
      await checkKeys(server.base, keys, { get, unresolved: {} })
      expect(skippedSensitive).toBe(1)
      expect(server.hits.some((hit) => hit.path.startsWith('/track'))).toBe(false)
      expect(server.hits.some((hit) => hit.path === '/')).toBe(true)
    } finally {
      await server.close()
    }
  })
})

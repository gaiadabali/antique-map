/**
 * The health route itself (TASKS.md 4.6.a; ARCHITECTURE.md §15 condition 2; 4.3 senior-be #13):
 * it never loads Payload but through the loader it is given, reads its request first, answers
 * `no-store` JSON, and runs one check at a time behind a ~5 s memo (4.1 senior-be #5).
 */
import { randomBytes } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PayloadHealthPorts } from './ports'
import { healthRoute, HEALTH_MEMO_MS, type PayloadPortsLoader } from './route'

// Were `./route` to import the Payload-backed ports statically, this file could not even load.
vi.mock('./payload-ports', () => {
  throw new Error('a health test loaded ./payload-ports, and with it Payload')
})

const ENV = {
  GALLERY_HOSTS: 'gallery.localhost',
  SHOP_HOSTS: 'shop.localhost',
  PORT: '4206',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:1/none',
  PAYLOAD_SECRET: 'x'.repeat(40),
  ORDER_LINK_KEY: Buffer.alloc(32, 7).toString('base64'),
  LOCAL_PRODUCTION_BUILD: '1',
  LINK_TOKEN_KEYS: `dev:${randomBytes(32).toString('base64url')}`,
}

const healthy = (calls: { database: number }): PayloadHealthPorts => ({
  database: async () => {
    calls.database++
    return { ok: true, probe: async () => ({ transactionIsolation: 'read committed' }) }
  },
  queue: async () => ({ ok: true, detail: 'no-tasks', pending: 0, lagSeconds: 0, stalled: 0 }),
})

const loader =
  (ports: PayloadHealthPorts): PayloadPortsLoader =>
  async () => ({
    payloadHealthPorts: () => ports,
  })

const get = () => new Request('http://localhost/api/health')

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GET /api/health', () => {
  it('answers 200 no-store JSON with app, database, storage, queue and the environment', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = await healthRoute(loader(healthy({ database: 0 })), ENV)(get())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toMatch(/^application\/json/)
    const body = await response.json()
    expect(body).toMatchObject({
      status: 'ok',
      environment: 'local',
      checks: {
        app: { ok: true },
        database: { ok: true },
        storage: { ok: true, detail: 'local-disk' },
        queue: { ok: true, detail: 'no-tasks' },
      },
    })
  })

  it('reads its request before it loads the ports', async () => {
    const order: string[] = []
    const request = get()
    const headers = request.headers
    vi.spyOn(headers, 'get').mockImplementation(() => (order.push('request'), null))
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const load: PayloadPortsLoader = async () => (
      order.push('load'),
      loader(healthy({ database: 0 }))()
    )
    await healthRoute(load, ENV)(request)
    expect(order.slice(0, 2)).toEqual(['request', 'load'])
  })

  it('answers 503 with a database error when the ports cannot even be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const load: PayloadPortsLoader = () => Promise.reject(new Error('config did not evaluate'))
    const response = await healthRoute(load, ENV)(get())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      checks: { database: { ok: false, detail: 'error' } },
    })
  })

  it('runs one check for a burst, and again only once the memo has lapsed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const calls = { database: 0 }
    const GET = healthRoute(loader(healthy(calls)), ENV)
    const burst = await Promise.all(Array.from({ length: 20 }, () => GET(get())))
    expect(burst.every((response) => response.status === 200)).toBe(true)
    expect(calls.database).toBe(1)
    vi.advanceTimersByTime(HEALTH_MEMO_MS - 1)
    await GET(get())
    expect(calls.database).toBe(1)
    vi.advanceTimersByTime(2)
    await GET(get())
    expect(calls.database).toBe(2)
  })
})

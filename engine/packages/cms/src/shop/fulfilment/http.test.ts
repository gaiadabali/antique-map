import { describe, expect, it } from 'vitest'

import { driverImagePurgeRoute } from './http'

const post = () => new Request('http://localhost/api/x/cron/driver-images', { method: 'POST' })
const allow = () => null
const NOW = new Date('2026-10-05T03:00:00Z')

describe('the driver-image purge route', () => {
  it('answers the bearer check’s refusal without loading anything', async () => {
    let loaded = false
    const route = driverImagePurgeRoute({
      refuse: () => new Response('no', { status: 401 }),
      load: async () => {
        loaded = true
        return { run: async () => ({ purged: 0, failed: 0 }) }
      },
    })
    expect((await route(post())).status).toBe(401)
    expect(loaded).toBe(false)
  })

  it('runs the purge at the given time and reports the run', async () => {
    const seen: Date[] = []
    const route = driverImagePurgeRoute({
      refuse: allow,
      now: () => NOW,
      load: async () => ({
        run: async (now) => {
          seen.push(now)
          return { purged: 3, failed: 1 }
        },
      }),
    })
    const response = await route(post())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ job: 'driver-images', purged: 3, failed: 1 })
    expect(seen).toEqual([NOW])
  })

  it('answers 409 to a tick that meets a run still going, and 500 when the run fails', async () => {
    let release: () => void = () => {}
    const route = driverImagePurgeRoute({
      refuse: allow,
      load: async () => ({
        run: () =>
          new Promise((resolve) => {
            release = () => resolve({ purged: 0, failed: 0 })
          }),
      }),
    })
    const first = route(post())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect((await route(post())).status).toBe(409)
    release()
    expect((await first).status).toBe(200)

    const failing = driverImagePurgeRoute({
      refuse: allow,
      load: async () => ({
        run: async () => {
          throw new Error('bucket down')
        },
      }),
    })
    const errors: unknown[] = []
    const original = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      expect((await failing(post())).status).toBe(500)
    } finally {
      console.error = original
    }
    expect(errors).toHaveLength(1)
  })
})

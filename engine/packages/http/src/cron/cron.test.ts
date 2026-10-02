/**
 * The cron routes (C13 `cron`, TASKS.md 4.1.b, 4.6.a): `CRON_SECRET` as a bearer, 503 while it is
 * unset; the jobs route running every queue with a per-run limit a caller may lower and never
 * raise, one run at a time, a throw logged and answered 500 — all without loading Payload.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { refuseCron } from './auth'
import {
  JOBS_PER_RUN,
  perRunLimit,
  summariseRun,
  type QueuePort,
  type QueueRun,
} from './jobs/queue'
import { jobsRoute, type QueuePortLoader } from './jobs/route'

// Were `./jobs/route` to import the Payload-backed port statically, this file could not load.
vi.mock('./jobs/payload-queue', () => {
  throw new Error('a cron test loaded ./jobs/payload-queue, and with it Payload')
})

const SECRET = { CRON_SECRET: 's3cret-value' }

const call = (authorization?: string, query = '') =>
  new Request(`http://localhost/api/x/cron/jobs${query}`, {
    method: 'POST',
    headers: authorization === undefined ? {} : { authorization },
  })

const RAN: QueueRun = { ran: 2, remaining: 0, drained: true }
const loaderOf =
  (runQueue: QueuePort): QueuePortLoader =>
  async () => ({ runQueue })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('refuseCron()', () => {
  it('answers 503 while CRON_SECRET is unset, whatever the caller sends', () => {
    expect(refuseCron(call('Bearer anything'), {})?.status).toBe(503)
    expect(refuseCron(call('Bearer '), { CRON_SECRET: '  ' })?.status).toBe(503)
  })

  it.each([
    undefined,
    'Bearer wrong',
    'bearer s3cret-value',
    's3cret-value',
    'Bearer s3cret-valuex',
    'Bearer  s3cret-value',
  ])('answers 401 to %s', (header) => {
    const refused = refuseCron(call(header), SECRET)
    expect(refused?.status).toBe(401)
    expect(refused?.headers.get('www-authenticate')).toBe('Bearer')
  })

  it('lets the crontab through, the secret trimmed as the boot check reads it', () => {
    expect(refuseCron(call('Bearer s3cret-value'), SECRET)).toBeNull()
    expect(refuseCron(call('Bearer s3cret-value'), { CRON_SECRET: ' s3cret-value\n' })).toBeNull()
  })
})

describe('perRunLimit()', () => {
  const url = (query = '') => new URL(`http://localhost/api/x/cron/jobs${query}`)

  it('defaults to the engine’s per-run limit', () => {
    expect(perRunLimit(url(), {})).toBe(JOBS_PER_RUN.default)
  })

  it('takes the host’s CRON_JOBS_LIMIT, capped', () => {
    expect(perRunLimit(url(), { CRON_JOBS_LIMIT: '25' })).toBe(25)
    expect(perRunLimit(url(), { CRON_JOBS_LIMIT: '100000' })).toBe(JOBS_PER_RUN.max)
  })

  it('lets a call lower the limit, never raise it', () => {
    expect(perRunLimit(url('?limit=3'), { CRON_JOBS_LIMIT: '25' })).toBe(3)
    expect(perRunLimit(url('?limit=90'), { CRON_JOBS_LIMIT: '25' })).toBe(25)
    expect(perRunLimit(url('?limit=-1'), {})).toBe(JOBS_PER_RUN.default)
  })
})

describe('summariseRun()', () => {
  it('counts the jobs Payload ran and what it says is left', () => {
    const result = { jobStatus: { 1: {}, 2: {} }, remainingJobsFromQueried: 1 }
    expect(summariseRun(result)).toEqual({ ran: 2, remaining: 1, drained: false })
    expect(summariseRun({ noJobsRemaining: true, remainingJobsFromQueried: 0 })).toEqual({
      ran: 0,
      remaining: 0,
      drained: true,
    })
  })
})

describe('POST /api/x/cron/jobs', () => {
  it('answers 503 unset and 401 without the bearer, never loading the queue', async () => {
    const load = vi.fn(loaderOf(async () => RAN))
    expect((await jobsRoute(load, {})(call('Bearer x'))).status).toBe(503)
    expect((await jobsRoute(load, SECRET)(call())).status).toBe(401)
    expect(load).not.toHaveBeenCalled()
  })

  it('runs the queue with the per-run limit and answers what it ran, no-store', async () => {
    const asked: number[] = []
    const route = jobsRoute(
      loaderOf(async ({ limit }) => (asked.push(limit), RAN)),
      { ...SECRET, CRON_JOBS_LIMIT: '25' },
    )
    const response = await route(call('Bearer s3cret-value', '?limit=3'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ ...RAN, limit: 3 })
    expect(asked).toEqual([3])
  })

  it('runs one at a time: a call mid-run answers 409 busy and runs nothing', async () => {
    let release!: () => void
    let runs = 0
    const route = jobsRoute(
      loaderOf(() => (runs++, new Promise<QueueRun>((resolve) => (release = () => resolve(RAN))))),
      SECRET,
    )
    const first = route(call('Bearer s3cret-value'))
    await vi.waitFor(() => expect(runs).toBe(1))
    const second = await route(call('Bearer s3cret-value'))
    expect(second.status).toBe(409)
    expect(second.headers.get('retry-after')).toBe('60')
    expect(await second.json()).toEqual({ busy: true })
    release()
    expect((await first).status).toBe(200)
    expect(runs).toBe(1) // the refused call ran nothing
    const third = route(call('Bearer s3cret-value'))
    await vi.waitFor(() => expect(runs).toBe(2)) // once the first has finished, the next may run
    release()
    expect((await third).status).toBe(200)
  })

  it('logs a throw with its cause redacted and answers a plain 500, then runs again', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    let fail = true
    const route = jobsRoute(
      loaderOf(async () => {
        if (fail) throw new Error('connect ECONNREFUSED postgres://u:hunter2@db/ig')
        return RAN
      }),
      SECRET,
    )
    const response = await route(call('Bearer s3cret-value'))
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await response.text()).not.toMatch(/ECONNREFUSED|hunter2/)
    expect(String(logged.mock.calls[0]?.[0])).toMatch(/\[cron\/jobs\].*ECONNREFUSED/)
    expect(String(logged.mock.calls[0]?.[0])).not.toContain('hunter2')
    fail = false
    expect((await route(call('Bearer s3cret-value'))).status).toBe(200)
  })

  it('a queue module that fails to load is a 500 too, never Next’s error page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const route = jobsRoute(() => Promise.reject(new Error('config')), SECRET)
    expect((await route(call('Bearer s3cret-value'))).status).toBe(500)
  })
})

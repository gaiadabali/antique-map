/**
 * `POST /api/x/cron/retention` (TASKS.md 9.1.d): the crontab's bearer first — 503 while
 * `CRON_SECRET` is unset, 401 without it — and Payload never loaded for a caller who has not
 * passed; then one run at a time, the counts as JSON, and a throw answered with a plain 500 that
 * carries no cause.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { retentionRoute, type RetentionLoader, type RetentionRun } from './route'

// Were `./route` to import the Payload-backed port statically, this file could not load.
vi.mock('./payload-retention', () => {
  throw new Error('a retention test loaded ./payload-retention, and with it Payload')
})

const SECRET = { CRON_SECRET: 's3cret-value' }
const NOW = new Date('2027-06-15T03:15:00.000Z')

const call = (authorization?: string) =>
  new Request('http://localhost/api/x/cron/retention', {
    method: 'POST',
    headers: authorization === undefined ? {} : { authorization },
  })

const COUNTS: RetentionRun = { chatSessions: 3, leads: 2, driverImages: 1 }
const loaderOf =
  (sweep: (now: Date) => Promise<RetentionRun>): RetentionLoader =>
  async () => ({ sweep })

afterEach(() => vi.restoreAllMocks())

describe('POST /api/x/cron/retention', () => {
  it('the cron route refuses without CRON_SECRET', async () => {
    const sweep = vi.fn(async () => COUNTS)
    const load = vi.fn(loaderOf(sweep))

    // CRON_SECRET unset: the route answers 503 whatever the caller sends.
    const unset = retentionRoute(load, {}, () => NOW)
    expect((await unset(call('Bearer anything'))).status).toBe(503)

    // CRON_SECRET set: no bearer or a wrong one is 401.
    const route = retentionRoute(load, SECRET, () => NOW)
    for (const header of [undefined, 'Bearer wrong', 's3cret-value', 'bearer s3cret-value']) {
      const refused = await route(call(header))
      expect(refused.status).toBe(401)
      expect(refused.headers.get('www-authenticate')).toBe('Bearer')
    }

    // Nothing ran and nothing was loaded for any of them.
    expect(load).not.toHaveBeenCalled()
    expect(sweep).not.toHaveBeenCalled()
  })

  it('runs the sweep for the crontab at the route’s clock and answers the counts', async () => {
    const sweep = vi.fn(async () => COUNTS)
    const route = retentionRoute(loaderOf(sweep), SECRET, () => NOW)
    const response = await route(call('Bearer s3cret-value'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ job: 'retention', ...COUNTS })
    expect(sweep).toHaveBeenCalledWith(NOW)
  })

  it('answers 409 to a tick that meets a run still going, and runs nothing for it', async () => {
    let release: (counts: RetentionRun) => void = () => undefined
    const sweep = vi.fn(() => new Promise<RetentionRun>((resolve) => (release = resolve)))
    const route = retentionRoute(loaderOf(sweep), SECRET, () => NOW)
    const first = route(call('Bearer s3cret-value'))
    await vi.waitFor(() => expect(sweep).toHaveBeenCalledTimes(1))

    const second = await route(call('Bearer s3cret-value'))
    expect(second.status).toBe(409)
    expect(await second.json()).toEqual({ busy: true })

    release(COUNTS)
    expect((await first).status).toBe(200)
    // The next tick runs again.
    release = () => undefined
    sweep.mockResolvedValueOnce(COUNTS)
    expect((await route(call('Bearer s3cret-value'))).status).toBe(200)
  })

  it('logs a throw redacted and answers a plain 500 without the cause', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const route = retentionRoute(
      loaderOf(async () => {
        throw new Error('connect ECONNREFUSED postgres://user:hunter2@db/indies')
      }),
      SECRET,
      () => NOW,
    )
    const response = await route(call('Bearer s3cret-value'))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toMatch(/hunter2|ECONNREFUSED/)
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]![0])).not.toContain('hunter2')
  })
})

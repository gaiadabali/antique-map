/**
 * The cron routes (C13 `cron`, TASKS.md 4.1.b): `CRON_SECRET` as a bearer, 503 while it is unset,
 * a per-run limit a caller may lower and never raise.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { refuseCron } from './auth'
import { JOBS_PER_RUN, perRunLimit } from './jobs/queue'
import { POST as jobs } from './jobs/route'
import { POST as outbox } from './outbox/route'
import { POST as reconcile } from './reconcile/route'
import { POST as sweeps } from './sweeps/route'

const call = (authorization?: string) =>
  new Request('http://localhost/api/x/cron/jobs', {
    method: 'POST',
    headers: authorization === undefined ? {} : { authorization },
  })

afterEach(() => vi.unstubAllEnvs())

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
  ])('answers 401 to %s', (header) => {
    const refused = refuseCron(call(header), { CRON_SECRET: 's3cret-value' })
    expect(refused?.status).toBe(401)
    expect(refused?.headers.get('www-authenticate')).toBe('Bearer')
  })

  it('lets the crontab through', () => {
    expect(refuseCron(call('Bearer s3cret-value'), { CRON_SECRET: 's3cret-value' })).toBeNull()
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

describe('the routes', () => {
  it('/api/x/cron/jobs answers 503 not wired to an authorised call until it may reach Payload', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret-value')
    const response = await jobs(call('Bearer s3cret-value'))
    expect(response.status).toBe(503)
    expect(await response.text()).toMatch(/not wired/)
  })

  it.each([
    ['sweeps', sweeps],
    ['reconcile', reconcile],
    ['outbox', outbox],
  ])(
    '/api/x/cron/%s authenticates, then answers 404 until its lane builds it',
    async (_, route) => {
      vi.stubEnv('CRON_SECRET', '')
      expect((await route(call('Bearer x'))).status).toBe(503)
      vi.stubEnv('CRON_SECRET', 's3cret-value')
      expect((await route(call('Bearer x'))).status).toBe(401)
      expect((await route(call('Bearer s3cret-value'))).status).toBe(404)
    },
  )
})

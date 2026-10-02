/**
 * `/api/health`'s answer (TASKS.md 4.1.b, 4.6.a): it reports the environment the boot check judged,
 * fails on a failed gating check, never on the queue, and never leaks a finding's text.
 */
import { createHash } from 'node:crypto'

import type { BootReport } from '@engine/config/boot-check'
import { describe, expect, it } from 'vitest'

import { checkHealth, type HealthPorts } from './health'
import { healthPorts, storageCheck, unloadedPayloadPorts } from './ports'

/** Both sites' local hosts, as a workstation runs them, for the real boot check. */
const LOCAL_ENV = {
  GALLERY_HOSTS: 'gallery.localhost',
  SHOP_HOSTS: 'shop.localhost',
  PORT: '4206',
}

/** The same, with everything the boot check requires set, so a database outage is its only problem. */
const COMPLETE_ENV = {
  ...LOCAL_ENV,
  DATABASE_URL: 'postgres://app@localhost:5432/indies_test',
  PAYLOAD_SECRET: 'x'.repeat(40),
  LINK_TOKEN_KEYS: `k1:${createHash('sha256').update('health-test').digest().toString('base64url')}`,
}
const REFUSED_DB = 'connect ECONNREFUSED postgres://user:hunter2@db:5432/ig'

const report = (over: Partial<BootReport> = {}): BootReport => ({
  ok: true,
  environment: 'staging',
  loadersSource: 'payload',
  problems: [],
  warnings: [],
  ...over,
})

const ports = (over: Partial<HealthPorts> = {}): HealthPorts => ({
  boot: async () => report(),
  database: async () => ({ ok: true }),
  storage: () => ({ ok: true }),
  queue: async () => ({ ok: true, pending: 0, lagSeconds: 0, stalled: 0 }),
  log: () => {},
  ...over,
})

describe('checkHealth()', () => {
  it('answers 200 with the environment the boot check judged when every check passes', async () => {
    const { status, body } = await checkHealth(ports())
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'ok', environment: 'staging' })
  })

  it.each(['production', 'staging', 'local'] as const)(
    'reports %s as judged',
    async (environment) => {
      const { body } = await checkHealth(ports({ boot: async () => report({ environment }) }))
      expect(body.environment).toBe(environment)
    },
  )

  it('answers 503 when the boot check refused, and counts the findings without their text', async () => {
    const secret = { subject: 'PAYMENT_SG_STRIPE_SECRET_KEY', message: 'is missing' }
    const refused = report({ ok: false, environment: 'production', problems: [secret] })
    const logged: BootReport[] = []
    const { status, body } = await checkHealth(
      ports({ boot: async () => refused, log: (r) => logged.push(r) }),
    )
    expect(status).toBe(503)
    expect(body.status).toBe('fail')
    expect(body.checks.boot).toEqual({ ok: false, problems: 1, warnings: 0, detail: 'refused' })
    expect(JSON.stringify(body)).not.toContain('STRIPE')
    expect(logged).toEqual([refused]) // the full report goes to the process log
  })

  it('passes the database port’s probe to the boot check, so the database is asked once', async () => {
    const probe = async () => ({ transactionIsolation: 'read committed' })
    let given: unknown
    await checkHealth(
      ports({
        database: async () => ({ ok: true, probe }),
        boot: async (database) => ((given = database), report()),
      }),
    )
    expect(given).toBe(probe)
  })

  it('fails on an unmigrated database', async () => {
    const { status, body } = await checkHealth(
      ports({ database: async () => ({ ok: false, detail: 'unmigrated' }) }),
    )
    expect(status).toBe(503)
    expect(body.checks.database).toEqual({ ok: false, detail: 'unmigrated' })
  })

  it('fails the database and skips the queue when the database throws', async () => {
    let queued = false
    const { status, body } = await checkHealth(
      ports({
        database: async () => {
          throw new Error('connect ECONNREFUSED postgres://user:hunter2@db/ig')
        },
        queue: async () => ((queued = true), { ok: true }),
      }),
    )
    expect(status).toBe(503)
    expect(body.checks.database).toEqual({ ok: false, detail: 'error' })
    expect(body.checks.queue).toEqual({ ok: false, detail: 'no-database' })
    expect(queued).toBe(false)
    expect(JSON.stringify(body)).not.toContain('hunter2')
  })

  it('logs the database error’s cause, redacted, and keeps it out of the body (senior-be #1)', async () => {
    const logged: BootReport[] = []
    const failing = unloadedPayloadPorts(new Error(REFUSED_DB))
    const { body } = await checkHealth({
      ...healthPorts(failing, COMPLETE_ENV),
      log: (r) => logged.push(r),
    })
    const finding = logged[0]?.problems.find(
      (problem) => problem.subject === 'DATABASE_URL' && /did not answer/.test(problem.message),
    )
    expect(finding?.message).toMatch(/did not answer: .*ECONNREFUSED/)
    expect(finding?.message).not.toContain('hunter2')
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|hunter2|postgres:/)
  })

  it('reports a database outage as the database’s failure alone, never a refused boot (5.3.f)', async () => {
    const logged: BootReport[] = []
    const { status, body } = await checkHealth({
      ...healthPorts(unloadedPayloadPorts(new Error(REFUSED_DB)), COMPLETE_ENV),
      log: (r) => logged.push(r),
    })
    expect(status).toBe(503)
    expect(body.status).toBe('fail')
    expect(body.checks.boot).toEqual({ ok: true, problems: 0, warnings: expect.any(Number) })
    expect(body.checks.database).toEqual({ ok: false, detail: 'error' })
    expect(logged[0]?.problems).toEqual([expect.objectContaining({ outage: true })])
  })

  it('still reports a configuration fault beside the outage as refused, counting the fault alone', async () => {
    const { PAYLOAD_SECRET: _unset, ...missingSecret } = COMPLETE_ENV
    const { status, body } = await checkHealth(
      healthPorts(unloadedPayloadPorts(new Error(REFUSED_DB)), missingSecret),
    )
    expect(status).toBe(503)
    expect(body.checks.boot).toMatchObject({ ok: false, problems: 1, detail: 'refused' })
    expect(body.checks.database).toEqual({ ok: false, detail: 'error' })
  })

  it('fails the database closed when the boot check saw an outage its port did not', async () => {
    const outage = {
      subject: 'DATABASE_URL',
      message: 'the database did not answer',
      outage: true as const,
    }
    const { status, body } = await checkHealth(
      ports({ boot: async () => report({ ok: false, problems: [outage] }) }),
    )
    expect(status).toBe(503)
    expect(body.checks.boot).toMatchObject({ ok: true, problems: 0 })
    expect(body.checks.database).toEqual({ ok: false, detail: 'unreachable' })
    expect(body.checks.queue).toEqual({ ok: false, detail: 'no-database' })
  })

  it('fails closed, and still answers, when a port throws', async () => {
    const { status, body } = await checkHealth(
      ports({
        boot: async () => {
          throw new Error('boot check unreadable')
        },
        storage: () => {
          throw new Error('bucket?')
        },
      }),
    )
    expect(status).toBe(503)
    expect(body.environment).toBe('production')
    expect(body.checks.storage).toEqual({ ok: false, detail: 'error' })
  })
})

describe('the queue: reported, never gating (senior-be #3)', () => {
  it('a lagging or stalled queue is degraded, still 200, and says so', async () => {
    const lagging = { ok: false, detail: 'lagging', pending: 4, lagSeconds: 3_600, stalled: 0 }
    const { status, body } = await checkHealth(ports({ queue: async () => lagging }))
    expect(status).toBe(200)
    expect(body.status).toBe('degraded')
    expect(body.checks.queue).toEqual(lagging)
  })

  it('a queue port that throws is degraded too, never a 503', async () => {
    const { status, body } = await checkHealth(
      ports({
        queue: async () => {
          throw new Error('relation "payload_jobs" does not exist')
        },
      }),
    )
    expect(status).toBe(200)
    expect(body).toMatchObject({
      status: 'degraded',
      checks: { queue: { ok: false, detail: 'error' } },
    })
  })

  it('a failed gate is still a 503 whatever the queue says', async () => {
    const { status, body } = await checkHealth(
      ports({ storage: () => ({ ok: false, detail: 'not-configured' }) }),
    )
    expect(status).toBe(503)
    expect(body.status).toBe('fail')
  })
})

describe('storageCheck()', () => {
  it('passes with a bucket and an endpoint', () => {
    expect(storageCheck({ S3_BUCKET: 'm', S3_ENDPOINT: 'https://r2' })('production')).toEqual({
      ok: true,
    })
  })

  it('fails a deployed process without one — media never goes to the host disk', () => {
    expect(storageCheck({})('staging')).toEqual({ ok: false, detail: 'not-configured' })
  })

  it('lets a workstation use local disk', () => {
    expect(storageCheck({})('local')).toEqual({ ok: true, detail: 'local-disk' })
  })
})

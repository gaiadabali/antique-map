/**
 * `/api/health` (TASKS.md 4.1.b): it reports the environment the boot check judged, fails on any
 * failed check, never leaks a finding's text, and — until `@engine/http` may reach Payload —
 * answers 503 `not-wired` rather than a health it never checked.
 */
import type { BootReport } from '@engine/config/boot-check'
import { describe, expect, it } from 'vitest'

import { checkHealth, type HealthPorts } from './health'
import { defaultHealthPorts, storageCheck } from './ports'
import { GET } from './route'

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
  queue: async () => ({ ok: true }),
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
    expect(body.checks.boot).toEqual({ ok: false, problems: 1, warnings: 0, detail: 'refused' })
    expect(JSON.stringify(body)).not.toContain('STRIPE')
    expect(logged).toEqual([refused]) // the full report goes to the process log
  })

  it('passes the database probe to the boot check once the database answers', async () => {
    const probe = async () => ({ transactionIsolation: 'read committed' })
    let given: unknown
    await checkHealth(
      ports({
        database: async () => ({ ok: true, probe }),
        boot: async (database) => ((given = database?.probe), report()),
      }),
    )
    expect(given).toBe(probe)
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

describe('the route as built today', () => {
  it('answers 503 not-wired: the database is not reached until @engine/http may import Payload', async () => {
    const { status, body } = await checkHealth({ ...defaultHealthPorts({}), log: () => {} })
    expect(status).toBe(503)
    expect(body.checks.database).toEqual({ ok: false, detail: 'not-wired' })
  })

  it('is never cached', async () => {
    const response = await GET(new Request('http://localhost/api/health'))
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toMatch(/^application\/json/)
  })
})

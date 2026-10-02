import { describe, expect, it } from 'vitest'

import {
  assertBootable,
  BootCheckError,
  bootCheck,
  checkDatabase,
  formatBootReport,
  isRefused,
  runBootCheck,
  type DatabaseProbe,
} from './index'
import { redactCredentials } from './redact'
import { fullEnv, secret } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
/** What a workstation has: .env.example's hosts and development secret, plus a link-key ring. */
const workstation = (extra: Record<string, string | undefined> = {}) => ({
  NODE_ENV: 'development',
  GALLERY_HOSTS: 'gallery.localhost',
  SHOP_HOSTS: 'shop.localhost',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/indies_plt',
  PAYLOAD_SECRET: 'dev-only-not-a-secret',
  LINK_TOKEN_KEYS: `dev:${secret(5)}`,
  ...extra,
})

describe('runBootCheck() — at process start', () => {
  it('starts a workstation with no brand at all, and names what it lacks as warnings', async () => {
    const report = await runBootCheck({ env: workstation(), now: NOW })
    expect(report.problems, formatBootReport(report)).toEqual([])
    expect(report.environment).toBe('local')
    expect(report.warnings.map((warning) => warning.subject)).toContain('S3_BUCKET')
  })

  it('refuses a production build whose hosts are none of the sites’ own', async () => {
    const env = workstation({
      NODE_ENV: 'production',
      GALLERY_HOSTS: 'somewhere.example.com',
      SHOP_HOSTS: 'elsewhere.example.com',
    })
    const report = await runBootCheck({ env, now: NOW })
    expect(report.environment).toBe('production')
    expect(report.problems.map((problem) => problem.subject)).toEqual(
      expect.arrayContaining(['GALLERY_HOSTS', 'PAYLOAD_SECRET']),
    )
  })

  it('probes the database when given a probe: reachable, and READ COMMITTED', async () => {
    const run = (probe: () => Promise<{ transactionIsolation: string }>) =>
      runBootCheck({ env: workstation(), database: probe, now: NOW })
    expect((await run(async () => ({ transactionIsolation: 'read committed' }))).ok).toBe(true)
    const serializable = await run(async () => ({ transactionIsolation: 'serializable' }))
    expect(serializable.problems).toEqual([
      {
        subject: 'DATABASE_URL',
        message: expect.stringMatching(
          /"serializable"; the domain transactions run READ COMMITTED/,
        ),
      },
    ])
  })

  it('refuses an unreachable database without leaking its credentials', async () => {
    const [finding] = await checkDatabase(async () => {
      throw new Error('connect failed for postgres://app:hunter2@db.internal:5432/indies_db')
    })
    expect(finding?.message).toBe(
      'the database did not answer: connect failed for postgres://…@db.internal:5432/indies_db',
    )
  })

  it('assertBootable() throws a BootCheckError listing every problem', async () => {
    const report = await runBootCheck({
      env: workstation({ PAYLOAD_SECRET: undefined, DATABASE_URL: undefined }),
      now: NOW,
    })
    expect(() => assertBootable(report)).toThrow(BootCheckError)
    try {
      assertBootable(report)
    } catch (error) {
      const message = (error as Error).message
      expect(message).toMatch(/^boot check refused to start \(local\): 2 problem\(s\)/)
      expect(message).toContain('✗ DATABASE_URL: is not set')
      expect(message).toContain('✗ PAYLOAD_SECRET: is not set')
    }
  })
})

describe('bootCheck() — the link-key ring and redaction', () => {
  it('passes on a retired key past its overlap as a warning', () => {
    const env = {
      ...fullEnv('production'),
      LINK_TOKEN_KEYS: 'k2:' + secret(2) + ',k1:' + secret(1) + ':2025-01-01',
    }
    const report = bootCheck({ env, now: NOW })
    expect(report.ok, formatBootReport(report)).toBe(true)
    expect(report.warnings.map((warning) => warning.subject)).toEqual(['LINK_TOKEN_KEYS'])
  })

  it('redacts credentials up to the last @, a password holding one included', () => {
    expect(
      redactCredentials('failed: postgres://u:p@ss@host:5432/db and https://a@b.example/x'),
    ).toBe('failed: postgres://…@host:5432/db and https://…@b.example/x')
    expect(redactCredentials('mailto-free text: desk@example.com')).toBe(
      'mailto-free text: desk@example.com',
    )
  })

  it('redacts a password in a URL query and in a libpq keyword/value string', () => {
    const cases: [string, string][] = [
      [
        'postgres://h/db?sslmode=require&password=hunter2',
        'postgres://h/db?sslmode=require&password=…',
      ],
      ['host=db user=app password=hunter2 dbname=x', 'host=db user=app password=… dbname=x'],
      ["host=db password='hun ter2' dbname=x", 'host=db password=… dbname=x'],
      ['{"password":"hunter2"}', '{"password":"…"}'],
    ]
    for (const [text, redacted] of cases) {
      expect(redactCredentials(text)).toBe(redacted)
      expect(redactCredentials(text)).not.toContain('hunter')
    }
  })
})

describe('runBootCheck() — a database outage is not a refused boot', () => {
  const down = async (): Promise<never> => {
    throw new Error('connect ECONNREFUSED postgres://app:hunter2@db.internal:5432/indies_db')
  }
  const run = (extra: Record<string, string | undefined>, database: DatabaseProbe) =>
    runBootCheck({ env: workstation(extra), database, now: NOW })

  it('reports a database that does not answer as unavailable, never as a refused start', async () => {
    const report = await run({}, down)
    expect(report.ok).toBe(false) // the health check still fails…
    expect(isRefused(report)).toBe(false) // …but the process booted
    expect(report.problems).toEqual([
      {
        subject: 'DATABASE_URL',
        message:
          'the database did not answer: connect ECONNREFUSED postgres://…@db.internal:5432/indies_db',
        outage: true,
      },
    ])
    const text = formatBootReport(report)
    expect(text.split('\n')[0]).toBe(
      'boot check passed (local, loaders from payload), but DATABASE_URL is unavailable: an outage, not a refused start',
    )
    expect(text).not.toContain('hunter2')
  })

  it('still refuses a configuration fault, alone or beside an outage', async () => {
    const serializable = await run({}, async () => ({ transactionIsolation: 'serializable' }))
    expect(isRefused(serializable)).toBe(true)
    const both = await run({ HOSTNAME: '127.1' }, down)
    expect(isRefused(both)).toBe(true)
    expect(formatBootReport(both)).toMatch(/^boot check refused to start \(local\): 2 problem/)
    const clean = await run({}, async () => ({ transactionIsolation: 'read committed' }))
    expect([clean.ok, isRefused(clean)]).toEqual([true, false])
  })
})

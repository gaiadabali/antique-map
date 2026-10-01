import { describe, expect, it } from 'vitest'

import { testEnv } from '../validate/testing/fixtures'
import {
  assertBootable,
  BootCheckError,
  checkDatabase,
  formatBootReport,
  isRefused,
  runBootCheck,
  type DatabaseProbe,
} from './index'
import { redactCredentials } from '../loader/redact'
import { bootCheck } from './index'
import { deployableConfig, fullEnv, REPO_ROOT, secret } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
/** What a workstation running the synthetic brand has (.env.example plus a link-key ring). */
const workstation = (
  storefront: 'gallery' | 'emporium',
  extra: Record<string, string | undefined> = {},
) => ({
  ...testEnv(storefront),
  NODE_ENV: 'development',
  SITE_URL: 'http://localhost:4166',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test_gallery_p3_plt',
  PAYLOAD_SECRET: 'dev-only-not-a-secret',
  LINK_TOKEN_KEYS: `dev:${secret(5)}`,
  ...extra,
})

describe('runBootCheck() — at process start', () => {
  it('starts the synthetic brand on a workstation, both storefronts, and names what it lacks', async () => {
    for (const storefront of ['gallery', 'emporium'] as const) {
      const report = await runBootCheck({
        env: workstation(storefront),
        cwd: REPO_ROOT,
        fresh: true,
        now: NOW,
      })
      expect(report.problems).toEqual([])
      expect(report.environment).toBe('local')
      // No sandbox credentials on this workstation: every provider says so, none refuses.
      expect(report.warnings.some((warning) => warning.subject.startsWith('PAYMENT_'))).toBe(true)
    }
  })

  it('refuses a brand that will not load, naming why', async () => {
    const report = await runBootCheck({
      env: workstation('gallery', { BRAND: undefined }),
      cwd: REPO_ROOT,
      fresh: true,
    })
    expect(report.ok).toBe(false)
    expect(report.problems).toEqual([
      { subject: 'BRAND', message: expect.stringMatching(/BRAND is not set/) },
    ])
  })

  it('refuses the synthetic brand once it runs as a production build on a real host', async () => {
    const env = workstation('gallery', {
      NODE_ENV: 'production',
      SITE_URL: 'https://somewhere.example.com',
    })
    const report = await runBootCheck({ env, cwd: REPO_ROOT, fresh: true, now: NOW })
    expect(report.environment).toBe('production')
    expect(report.problems.map((problem) => problem.subject)).toEqual(
      expect.arrayContaining(['SITE_URL', 'BRAND']),
    )
  })

  it('probes the database when given a probe: reachable, and READ COMMITTED', async () => {
    const run = (probe: () => Promise<{ transactionIsolation: string }>) =>
      runBootCheck({ env: workstation('gallery'), cwd: REPO_ROOT, database: probe, now: NOW })
    expect((await run(async () => ({ transactionIsolation: 'read committed' }))).ok).toBe(true)
    const serializable = await run(async () => ({ transactionIsolation: 'serializable' }))
    expect(serializable.problems).toEqual([
      {
        subject: 'DATABASE_URL',
        message: expect.stringMatching(/"serializable"; the engine runs on READ COMMITTED/),
      },
    ])
  })

  it('refuses an unreachable database without leaking its credentials', async () => {
    const [finding] = await checkDatabase(async () => {
      throw new Error('connect failed for postgres://app:hunter2@db.internal:5432/ig_db')
    })
    expect(finding?.message).toBe(
      'the database did not answer: connect failed for postgres://…@db.internal:5432/ig_db',
    )
  })

  it('assertBootable() throws a BootCheckError listing every problem', async () => {
    const report = await runBootCheck({
      env: workstation('gallery', { LINK_TOKEN_KEYS: undefined, DATABASE_URL: undefined }),
      cwd: REPO_ROOT,
      now: NOW,
    })
    expect(() => assertBootable(report)).toThrow(BootCheckError)
    try {
      assertBootable(report)
    } catch (error) {
      const message = (error as Error).message
      expect(message).toMatch(/^boot check refused to start \(local\): 2 problem\(s\)/)
      expect(message).toContain('✗ DATABASE_URL: is not set')
      expect(message).toContain('✗ LINK_TOKEN_KEYS: is not set')
    }
  })
})

describe('bootCheck() — review fixes (3.1)', () => {
  const config = deployableConfig()
  const check = (env: Record<string, string | undefined>) => bootCheck({ env, config, now: NOW })

  it('judges a production build with no SITE_URL as production, and refuses it', () => {
    const report = check({ ...fullEnv(config, 'production'), SITE_URL: undefined })
    expect(report.environment).toBe('production')
    expect(report.problems.map((problem) => problem.subject)).toContain('SITE_URL')
  })

  it('requires an absolute BRAND_ROOT on a deployed host, never a searched-for one', () => {
    for (const [value, message] of [
      [undefined, /is not set/],
      ['./test', /must be an absolute path/],
    ] as const) {
      const report = check({ ...fullEnv(config, 'staging'), BRAND_ROOT: value })
      expect(report.problems.find((problem) => problem.subject === 'BRAND_ROOT')?.message).toMatch(
        message,
      )
    }
    expect(check({ ...fullEnv(config, 'local'), BRAND_ROOT: './test' }).ok).toBe(true)
  })

  it('passes on a retired key past its overlap as a warning', () => {
    const env = {
      ...fullEnv(config, 'production'),
      LINK_TOKEN_KEYS: 'k2:' + secret(2) + ',k1:' + secret(1) + ':2025-01-01',
    }
    const report = check(env)
    expect(report.ok).toBe(true)
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

  it('redacts a password in a URL query and in a libpq keyword/value string (3.1 qa)', () => {
    const cases: [string, string][] = [
      [
        'postgres://db.internal/ig?sslmode=require&password=hunter2&connect_timeout=5',
        'postgres://db.internal/ig?sslmode=require&password=…&connect_timeout=5',
      ],
      [
        'postgres://app@db.internal/ig?password=hunter2#x',
        'postgres://…@db.internal/ig?password=…#x',
      ],
      [
        'host=db.internal port=5432 user=app password=hunter2 dbname=ig',
        'host=db.internal port=5432 user=app password=… dbname=ig',
      ],
      ["host=db password = 'hunter 2 \\' quoted' dbname=ig", 'host=db password = … dbname=ig'],
      ["password='hunter2 cut off", 'password=…'],
      ['PGPASSWORD=hunter2 sslpassword=hunter3', 'PGPASSWORD=… sslpassword=…'],
      ['invalid option "password=hunter2"', 'invalid option "password=…"'],
      // 3.4 senior-be #3: a raw "/" in a URL's password, a double-quoted pair, a JSON body.
      ['postgres://app:Zx9/k+Qw==@db.internal/ig', 'postgres://…@db.internal/ig'],
      ['host=db password="hunter 2" dbname=ig', 'host=db password=… dbname=ig'],
      ['{"user":"app","password":"hunter\\"2"}', '{"user":"app","password":"…"}'],
    ]
    for (const [text, redacted] of cases) {
      expect(redactCredentials(text)).toBe(redacted)
      expect(redactCredentials(text)).not.toContain('hunter')
    }
    // Words about a password, with no value, are left as they are.
    const plain = 'password authentication failed for user "app"'
    expect(redactCredentials(plain)).toBe(plain)
  })

  it('refuses an unreachable database whose error quotes a libpq string, without its password', async () => {
    const [finding] = await checkDatabase(async () => {
      throw new Error('could not connect: host=db.internal user=app password=hunter2 dbname=ig')
    })
    expect(finding?.message).toBe(
      'the database did not answer: could not connect: host=db.internal user=app password=… dbname=ig',
    )
  })
})

describe('runBootCheck() — a database outage is not a refused boot (qa’s phase 4 L1, 5.3.f)', () => {
  const down = async (): Promise<never> => {
    throw new Error('connect ECONNREFUSED postgres://app:hunter2@db.internal:5432/ig_db')
  }
  const run = (extra: Record<string, string | undefined>, database: DatabaseProbe) =>
    runBootCheck({ env: workstation('gallery', extra), cwd: REPO_ROOT, database, now: NOW })

  it('reports a database that does not answer as unavailable, never as a refused start', async () => {
    const report = await run({}, down)
    expect(report.ok).toBe(false) // the health check still fails…
    expect(isRefused(report)).toBe(false) // …but the process booted
    expect(report.problems).toEqual([
      {
        subject: 'DATABASE_URL',
        message:
          'the database did not answer: connect ECONNREFUSED postgres://…@db.internal:5432/ig_db',
        outage: true,
      },
    ])
    const text = formatBootReport(report)
    expect(text).not.toContain('refused to start')
    expect(text.split('\n')[0]).toBe(
      'boot check passed (local, loaders from payload), but DATABASE_URL is unavailable: an outage, not a refused start',
    )
    expect(text).toContain('✗ DATABASE_URL: the database did not answer')
    expect(text).not.toContain('hunter2')
  })

  it('still refuses a configuration fault, alone or beside an outage', async () => {
    const serializable = await run({}, async () => ({ transactionIsolation: 'serializable' }))
    expect(isRefused(serializable)).toBe(true) // a database on the wrong isolation is refused
    expect(formatBootReport(serializable)).toMatch(
      /^boot check refused to start \(local\): 1 problem/,
    )
    const both = await run({ HOSTNAME: '127.1' }, down)
    expect(isRefused(both)).toBe(true)
    expect(formatBootReport(both)).toMatch(/^boot check refused to start \(local\): 2 problem/)
    const clean = await run({}, async () => ({ transactionIsolation: 'read committed' }))
    expect([clean.ok, isRefused(clean)]).toEqual([true, false])
    const [head] = formatBootReport(clean).split('\n')
    expect(head).toBe('boot check passed (local, loaders from payload)')
  })
})

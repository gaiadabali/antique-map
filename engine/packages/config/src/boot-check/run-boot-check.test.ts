import { describe, expect, it } from 'vitest'

import { testEnv } from '../validate/testing/fixtures'
import { assertBootable, BootCheckError, checkDatabase, runBootCheck } from './index'
import { REPO_ROOT, secret } from './testing'

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

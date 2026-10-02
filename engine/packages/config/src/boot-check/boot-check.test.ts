import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, type BootReport } from './index'
import { fullEnv, secret } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const check = (env: Record<string, string | undefined>) => bootCheck({ env, now: NOW })
const subjects = (report: BootReport) => report.problems.map((problem) => problem.subject)
const refusal = (report: BootReport, subject: string) => {
  expect(report.ok).toBe(false)
  const found = report.problems.find((problem) => problem.subject === subject)
  expect(found, formatBootReport(report)).toBeDefined()
  return found?.message ?? ''
}

describe('bootCheck() — missing secrets refuse the start', () => {
  it('refuses a missing database or Payload secret anywhere, a workstation included', () => {
    for (const name of ['DATABASE_URL', 'PAYLOAD_SECRET']) {
      expect(refusal(check({ ...fullEnv('local'), [name]: undefined }), name)).toMatch(/is not set/)
    }
  })

  it('needs no link-key ring, on a host or a workstation (DEPLOYMENT.md §8), but checks one that is set', () => {
    for (const environment of ['local', 'staging', 'production'] as const) {
      const report = check({ ...fullEnv(environment), LINK_TOKEN_KEYS: undefined })
      expect(report.problems, formatBootReport(report)).toEqual([])
    }
  })

  it('refuses the deployed-only secrets on a deployed host, and only warns on a workstation', () => {
    expect(
      refusal(check({ ...fullEnv('production'), CRON_SECRET: undefined }), 'CRON_SECRET'),
    ).toMatch(/is not set/)
    const local = check({ ...fullEnv('local'), CRON_SECRET: undefined })
    expect(local.ok).toBe(true)
    expect(local.warnings.map((warning) => warning.subject)).toContain('CRON_SECRET')
  })

  it('reads no brand: BRAND, BRAND_ROOT and SITE_URL are neither needed nor read', () => {
    const report = check({ ...fullEnv('staging'), BRAND: 'anything', BRAND_ROOT: './x' })
    expect(report.problems, formatBootReport(report)).toEqual([])
    expect(formatBootReport(report)).not.toMatch(/BRAND|SITE_URL/)
  })

  it('refuses a malformed LINK_TOKEN_KEYS: no current key or two, a repeated kid, a short key, a future day', () => {
    const rings = {
      'has no current key': `old:${secret(1)}:2026-01-01`,
      'has 2 current keys': `a:${secret(1)},b:${secret(2)}`,
      'the kid is used twice': `a:${secret(1)},a:${secret(2)}:2026-01-01`,
      'needs 32 random bytes or more': `a:${Buffer.from(Array.from({ length: 16 }, (_, i) => i)).toString('base64url')}`,
      'is in the future': `b:${secret(2)},a:${secret(1)}:2026-10-01`,
    }
    for (const [expected, ring] of Object.entries(rings)) {
      const report = check({ ...fullEnv('local'), LINK_TOKEN_KEYS: ring })
      expect(refusal(report, 'LINK_TOKEN_KEYS')).toContain(expected)
    }
  })

  it('never writes a secret’s value into the report', () => {
    const text = formatBootReport(
      check({ ...fullEnv('production'), PAYLOAD_SECRET: 'dev-only-LEAKME' }),
    )
    expect(text).toContain('PAYLOAD_SECRET')
    expect(text).not.toContain('LEAKME')
  })
})

describe('bootCheck() — loader source and development defaults', () => {
  it('refuses LOADERS_SOURCE=fixtures in production, warns on staging, allows it locally', () => {
    expect(
      refusal(check({ ...fullEnv('production'), LOADERS_SOURCE: 'fixtures' }), 'LOADERS_SOURCE'),
    ).toMatch(/production renders the catalogue/)
    const staging = check({ ...fullEnv('staging'), LOADERS_SOURCE: 'fixtures' })
    expect(staging).toMatchObject({ ok: true, loadersSource: 'fixtures' })
    expect(check({ ...fullEnv('local'), LOADERS_SOURCE: 'fixtures' })).toMatchObject({
      ok: true,
      loadersSource: 'fixtures',
    })
    expect(
      refusal(check({ ...fullEnv('local'), LOADERS_SOURCE: 'cms' }), 'LOADERS_SOURCE'),
    ).toMatch(/is "cms"/)
  })

  it('refuses development defaults and short secrets on a deployed host', () => {
    const env = {
      ...fullEnv('staging'),
      PAYLOAD_SECRET: 'dev-only-not-a-secret',
      CRON_SECRET: 'short',
      S3_ACCESS_KEY_ID: 'minioadmin',
    }
    expect(subjects(check(env))).toEqual(['PAYLOAD_SECRET', 'CRON_SECRET', 'S3_ACCESS_KEY_ID'])
    expect(check({ ...fullEnv('local'), PAYLOAD_SECRET: 'dev-only-not-a-secret' }).ok).toBe(true)
    expect(
      refusal(check({ ...fullEnv('local'), DATABASE_URL: 'mysql://x' }), 'DATABASE_URL'),
    ).toMatch(/postgres/)
    expect(
      refusal(check({ ...fullEnv('local'), RUN_MIGRATIONS: 'yes' }), 'RUN_MIGRATIONS'),
    ).toMatch(/"1" in the web process/)
  })
})

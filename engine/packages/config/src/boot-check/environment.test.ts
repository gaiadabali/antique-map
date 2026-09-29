// Which environment a process is judged to run in (`./environment.ts`): a production build at a
// loopback SITE_URL is local only with LOCAL_PRODUCTION_BUILD=1, which a worktree and CI set and a
// host never does (3.4 senior-be #1) — otherwise it is judged production, and refused; with it,
// still said out loud and still on sandbox keys only. `0.0.0.0` is no loopback origin.
import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, type BootReport } from './index'
import { deployableConfig, fullEnv } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const config = deployableConfig()
const check = (env: Record<string, string | undefined>) => bootCheck({ env, config, now: NOW })
const LOCAL_BUILD = { NODE_ENV: 'production', LOCAL_PRODUCTION_BUILD: '1' }
const production = (siteUrl: string | undefined, extra: Record<string, string> = {}) =>
  check({ ...fullEnv(config, 'local'), NODE_ENV: 'production', SITE_URL: siteUrl, ...extra })
const findingsOf = (report: BootReport, subject: string) => ({
  problems: report.problems.filter((finding) => finding.subject === subject),
  warnings: report.warnings.filter((finding) => finding.subject === subject),
})
const siteUrlFindings = (report: BootReport) => findingsOf(report, 'SITE_URL')
const LOOPBACKS = [
  'http://localhost:4169',
  'http://127.0.0.1:4169',
  'http://[::1]:4169',
  'http://shop.localhost:4169',
]

describe('bootCheck() — a production build on a loopback SITE_URL', () => {
  it('is production, and refused, unless it says it is local: a host provisioned from .env.example', () => {
    for (const site of LOOPBACKS) {
      // .env.example's loopback SITE_URL and development secret, on a production build.
      const report = production(site, { PAYLOAD_SECRET: 'dev-only-not-a-secret' })
      expect(report.environment, site).toBe('production')
      expect(siteUrlFindings(report).problems, site).toEqual([
        {
          subject: 'SITE_URL',
          message: expect.stringMatching(
            /^is loopback \(.+\) in a production build, judged as production: a workstation or CI running one sets LOCAL_PRODUCTION_BUILD=1/,
          ),
        },
      ])
      // The strict rules hold again: the development secret is refused.
      const subjects = report.problems.map((finding) => finding.subject)
      expect(subjects, site).toContain('PAYLOAD_SECRET')
    }
  })

  it('is local with LOCAL_PRODUCTION_BUILD=1, and the report says so', () => {
    for (const site of LOOPBACKS) {
      const report = production(site, { LOCAL_PRODUCTION_BUILD: '1' })
      expect(report.environment, site).toBe('local')
      expect(report.problems, formatBootReport(report)).toEqual([])
      expect(siteUrlFindings(report).warnings, site).toEqual([
        {
          subject: 'SITE_URL',
          message: expect.stringMatching(
            /^is loopback \(.+\) and LOCAL_PRODUCTION_BUILD=1: a production build run as local — sandbox keys only/,
          ),
        },
      ])
    }
  })

  it('ignores the opt-in, and says so, on the brand’s own domain; it makes no other host local', () => {
    const staging = check({ ...fullEnv(config, 'staging'), LOCAL_PRODUCTION_BUILD: '1' })
    expect(staging.environment).toBe('staging')
    expect(findingsOf(staging, 'LOCAL_PRODUCTION_BUILD').warnings).toEqual([
      {
        subject: 'LOCAL_PRODUCTION_BUILD',
        message: expect.stringMatching(
          /^is set on staging\.example\.com, the brand's staging domain, and ignored/,
        ),
      },
    ])
    const elsewhere = production('https://unknown.example.net', { LOCAL_PRODUCTION_BUILD: '1' })
    expect(elsewhere.environment).toBe('production')
    expect(siteUrlFindings(elsewhere).problems).toHaveLength(1)
  })

  it('refuses an opt-in other than "1", which opts in to nothing', () => {
    const report = production('http://localhost:4169', { LOCAL_PRODUCTION_BUILD: 'true' })
    expect(report.environment).toBe('production')
    expect(findingsOf(report, 'LOCAL_PRODUCTION_BUILD').problems).toEqual([
      {
        subject: 'LOCAL_PRODUCTION_BUILD',
        message: 'is "true"; it is "1" on a workstation or in CI, or unset',
      },
    ])
  })

  it('says nothing of a dev server on loopback, which is local by nature', () => {
    const report = check(fullEnv(config, 'local'))
    expect(report.environment).toBe('local')
    expect(siteUrlFindings(report)).toEqual({ problems: [], warnings: [] })
  })

  it('still refuses live keys: a host that holds production credentials cannot boot as local', () => {
    const report = check({
      ...fullEnv(config, 'local'),
      ...LOCAL_BUILD,
      PAYMENT_SG_STRIPE_SECRET_KEY: 'sk_live_x',
      PAYMENT_SG_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
    })
    expect(report.environment).toBe('local')
    expect(report.problems.map((finding) => finding.message)).toEqual([
      'is a live credential, but this is local: local runs on sandbox keys (DEPLOYMENT.md §8)',
      'is a live credential, but this is local: local runs on sandbox keys (DEPLOYMENT.md §8)',
    ])
  })

  it('judges 0.0.0.0 as production, opt-in or not: a bind address, never an origin', () => {
    for (const extra of [{}, { LOCAL_PRODUCTION_BUILD: '1' }] as Record<string, string>[]) {
      const report = production('http://0.0.0.0:3000', extra)
      expect(report.environment).toBe('production')
      expect(siteUrlFindings(report).problems).toEqual([
        {
          subject: 'SITE_URL',
          message: expect.stringMatching(/^host "0\.0\.0\.0" is none of the brand's domains/),
        },
      ])
    }
    // A dev server there is a workstation's affair.
    expect(
      check({ ...fullEnv(config, 'local'), SITE_URL: 'http://0.0.0.0:3000' }).environment,
    ).toBe('local')
  })

  it('fails closed without a usable SITE_URL: production, and refused', () => {
    for (const site of [undefined, 'localhost:4169', 'not a url']) {
      const report = production(site, { LOCAL_PRODUCTION_BUILD: '1' })
      expect(report.environment, String(site)).toBe('production')
      expect(siteUrlFindings(report).problems, String(site)).toHaveLength(1)
    }
  })
})

// Payload applies its bundled migrations on boot only in a production build (3.4.g, DEPLOYMENT.md
// §4): `RUN_MIGRATIONS=1` hands it the set, `NODE_ENV=production` lets it run.
describe('bootCheck() — RUN_MIGRATIONS outside a production build', () => {
  const migrationFindings = (report: BootReport) =>
    [...report.problems, ...report.warnings].filter((each) => each.subject === 'RUN_MIGRATIONS')

  it('warns a dev server given RUN_MIGRATIONS=1 that it will not migrate on boot', () => {
    const report = check({ ...fullEnv(config, 'local'), RUN_MIGRATIONS: '1' })
    expect(report.ok).toBe(true)
    expect(report.warnings.filter((each) => each.subject === 'RUN_MIGRATIONS')).toEqual([
      {
        subject: 'RUN_MIGRATIONS',
        message: expect.stringMatching(
          /^is "1", but this is not a production build: Payload migrates on boot only when NODE_ENV=production/,
        ),
      },
    ])
  })

  it('says nothing of it in a production build, on a host or a workstation, or when it is unset', () => {
    for (const environment of ['staging', 'production'] as const) {
      expect(
        migrationFindings(check({ ...fullEnv(config, environment), RUN_MIGRATIONS: '1' })),
      ).toEqual([])
    }
    const localBuild = { ...fullEnv(config, 'local'), ...LOCAL_BUILD, RUN_MIGRATIONS: '1' }
    expect(migrationFindings(check(localBuild))).toEqual([])
    expect(migrationFindings(check(fullEnv(config, 'local')))).toEqual([])
  })
})

// Which environment a process is judged to run in (`./environment.ts`), and the 3.4.f decision on
// a production build at a loopback SITE_URL (3.1 senior-be nit #5, qa #2): local, so a worktree
// or CI can open a production build on its own port — but said out loud, still on sandbox keys
// only, and `0.0.0.0` is no loopback origin.
import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, type BootReport } from './index'
import { deployableConfig, fullEnv } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const config = deployableConfig()
const check = (env: Record<string, string | undefined>) => bootCheck({ env, config, now: NOW })
const production = (siteUrl: string | undefined) =>
  check({ ...fullEnv(config, 'local'), NODE_ENV: 'production', SITE_URL: siteUrl })
const siteUrlFindings = (report: BootReport) => ({
  problems: report.problems.filter((finding) => finding.subject === 'SITE_URL'),
  warnings: report.warnings.filter((finding) => finding.subject === 'SITE_URL'),
})

describe('bootCheck() — a production build on a loopback SITE_URL', () => {
  it('is judged local, and the report says so', () => {
    for (const site of [
      'http://localhost:4169',
      'http://127.0.0.1:4169',
      'http://[::1]:4169',
      'http://shop.localhost:4169',
    ]) {
      const report = production(site)
      expect(report.environment, site).toBe('local')
      expect(report.problems, formatBootReport(report)).toEqual([])
      expect(siteUrlFindings(report).warnings, site).toEqual([
        {
          subject: 'SITE_URL',
          message: expect.stringMatching(
            /^is loopback \(.+\): a production build judged local — sandbox keys only/,
          ),
        },
      ])
    }
  })

  it('says nothing of a dev server on loopback, which is local by nature', () => {
    const report = check(fullEnv(config, 'local'))
    expect(report.environment).toBe('local')
    expect(siteUrlFindings(report)).toEqual({ problems: [], warnings: [] })
  })

  it('still refuses live keys: a host that holds production credentials cannot boot as local', () => {
    const report = check({
      ...fullEnv(config, 'local'),
      NODE_ENV: 'production',
      PAYMENT_SG_STRIPE_SECRET_KEY: 'sk_live_x',
      PAYMENT_SG_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
    })
    expect(report.environment).toBe('local')
    expect(report.problems.map((finding) => finding.message)).toEqual([
      'is a live credential, but this is local: local runs on sandbox keys (DEPLOYMENT.md §8)',
      'is a live credential, but this is local: local runs on sandbox keys (DEPLOYMENT.md §8)',
    ])
  })

  it('judges 0.0.0.0 as production: a bind address, never an origin', () => {
    const report = production('http://0.0.0.0:3000')
    expect(report.environment).toBe('production')
    expect(siteUrlFindings(report).problems).toEqual([
      {
        subject: 'SITE_URL',
        message: expect.stringMatching(/^host "0\.0\.0\.0" is none of the brand's domains/),
      },
    ])
    // A dev server there is a workstation's affair.
    expect(
      check({ ...fullEnv(config, 'local'), SITE_URL: 'http://0.0.0.0:3000' }).environment,
    ).toBe('local')
  })

  it('fails closed without a usable SITE_URL: production, and refused', () => {
    for (const site of [undefined, 'localhost:4169', 'not a url']) {
      const report = production(site)
      expect(report.environment, String(site)).toBe('production')
      expect(siteUrlFindings(report).problems, String(site)).toHaveLength(1)
    }
  })
})

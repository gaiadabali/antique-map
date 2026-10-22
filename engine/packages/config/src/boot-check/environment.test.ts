// Which environment a process is judged to run in (`./environment.ts`, DEPLOYMENT.md §7): by its
// canonical hosts against the hostnames `SITES` commits, never by NODE_ENV alone; a production
// build at local hosts is local only with LOCAL_PRODUCTION_BUILD=1, which a host never sets.
import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, type BootReport } from './index'
import { fullEnv } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const check = (env: Record<string, string | undefined>) => bootCheck({ env, now: NOW })
const findingsOf = (report: BootReport, subject: string) => ({
  problems: report.problems.filter((finding) => finding.subject === subject),
  warnings: report.warnings.filter((finding) => finding.subject === subject),
})

describe('bootCheck() — the environment from the hosts', () => {
  it('passes a complete environment everywhere it can run, judged from its hosts', () => {
    for (const environment of ['local', 'staging', 'production'] as const) {
      const report = check(fullEnv(environment))
      expect(report.problems, formatBootReport(report)).toEqual([])
      expect(report.environment).toBe(environment)
    }
  })

  it('judges by the canonical (first) host of each list, an alias after it changing nothing', () => {
    const report = check({
      ...fullEnv('staging'),
      GALLERY_HOSTS: 'indies-gallery.gaiada.com,antiquemapsindonesia.com',
    })
    expect(report.environment).toBe('staging')
  })

  it('fails closed on a mix, an unknown host or none: production, and refused', () => {
    const cases = {
      mix: { GALLERY_HOSTS: 'antiquemapsindonesia.com', SHOP_HOSTS: 'old-east-indies.gaiada.com' },
      unknown: { GALLERY_HOSTS: 'gallery.example.net', SHOP_HOSTS: 'oldeastindies.com' },
      'local beside production': { GALLERY_HOSTS: 'gallery.localhost' },
      none: { GALLERY_HOSTS: undefined, SHOP_HOSTS: undefined },
    }
    for (const [name, hosts] of Object.entries(cases)) {
      const report = check({ ...fullEnv('production'), ...hosts })
      expect(report.environment, name).toBe('production')
      expect(findingsOf(report, 'GALLERY_HOSTS').problems.length, name).toBeGreaterThan(0)
    }
  })

  it('refuses a dev server on a deployed host', () => {
    const report = check({ ...fullEnv('staging'), NODE_ENV: 'development' })
    expect(findingsOf(report, 'NODE_ENV').problems).toEqual([
      { subject: 'NODE_ENV', message: 'must be "production" on the staging hosts' },
    ])
  })

  it('is production, and refused, for a production build at local hosts unless it says it is local', () => {
    const build = { ...fullEnv('local'), NODE_ENV: 'production', PAYLOAD_SECRET: 'dev-only-x' }
    const refused = check(build)
    expect(refused.environment).toBe('production')
    expect(findingsOf(refused, 'GALLERY_HOSTS').problems[0]?.message).toMatch(
      /names local hosts in a production build, judged as production/,
    )
    // The strict rules hold again: the development secret is refused.
    expect(refused.problems.map((finding) => finding.subject)).toContain('PAYLOAD_SECRET')

    const local = check({ ...build, LOCAL_PRODUCTION_BUILD: '1' })
    expect(local.environment).toBe('local')
    expect(local.problems, formatBootReport(local)).toEqual([])
    expect(findingsOf(local, 'GALLERY_HOSTS').warnings[0]?.message).toMatch(
      /LOCAL_PRODUCTION_BUILD=1: a production build run as local/,
    )
  })

  it('treats any *.localhost pair as local, and nothing else', () => {
    const env = { ...fullEnv('local'), GALLERY_HOSTS: 'a.localhost', SHOP_HOSTS: 'b.localhost' }
    expect(check(env).environment).toBe('local')
    expect(check({ ...env, SHOP_HOSTS: 'localhost.example.com' }).environment).toBe('production')
  })

  it('ignores the opt-in on a deployed host, and says so', () => {
    const report = check({ ...fullEnv('staging'), LOCAL_PRODUCTION_BUILD: '1' })
    expect(report.environment).toBe('staging')
    expect(findingsOf(report, 'LOCAL_PRODUCTION_BUILD').warnings).toHaveLength(1)
  })

  it('refuses an opt-in other than "1", which opts in to nothing', () => {
    const report = check({
      ...fullEnv('local'),
      NODE_ENV: 'production',
      LOCAL_PRODUCTION_BUILD: 'true',
    })
    expect(report.environment).toBe('production')
    expect(findingsOf(report, 'LOCAL_PRODUCTION_BUILD').problems).toHaveLength(1)
  })
})

describe('bootCheck() — the site allow-list itself', () => {
  it('refuses a host listed for both sites, a port, a scheme, and an admin host on no list', () => {
    const subjectsOf = (env: Record<string, string | undefined>) =>
      check({ ...fullEnv('local'), ...env }).problems.map((finding) => finding.subject)
    expect(subjectsOf({ SHOP_HOSTS: 'gallery.localhost' })).toContain('SHOP_HOSTS')
    expect(subjectsOf({ GALLERY_HOSTS: 'gallery.localhost:3000' })).toContain('GALLERY_HOSTS')
    expect(subjectsOf({ SHOP_HOSTS: 'https://shop.localhost' })).toContain('SHOP_HOSTS')
    expect(subjectsOf({ ADMIN_HOST: 'admin.localhost' })).toContain('ADMIN_HOST')
    expect(subjectsOf({ ADMIN_HOST: 'gallery.localhost' })).toEqual([])
  })
})

describe('bootCheck() — RUN_MIGRATIONS outside a production build', () => {
  it('warns a dev server given RUN_MIGRATIONS=1 that it will not migrate on boot', () => {
    const report = check({ ...fullEnv('local'), RUN_MIGRATIONS: '1' })
    expect(report.ok).toBe(true)
    expect(findingsOf(report, 'RUN_MIGRATIONS').warnings[0]?.message).toMatch(
      /only when NODE_ENV=production/,
    )
  })

  it('says nothing of it in a production build, or when it is unset', () => {
    expect(
      findingsOf(check({ ...fullEnv('staging'), RUN_MIGRATIONS: '1' }), 'RUN_MIGRATIONS'),
    ).toEqual({ problems: [], warnings: [] })
    expect(findingsOf(check(fullEnv('local')), 'RUN_MIGRATIONS')).toEqual({
      problems: [],
      warnings: [],
    })
  })
})

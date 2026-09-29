// Which sister site a process talks to (`./sister.ts`, 3.4 senior-be #6): the committed
// `sisters[].baseUrl` is the sister's staging site; a host names its own in SISTER_BASE_URL —
// production must, and never the staging one — and a workstation may reach a local sister over
// http on loopback, C12's one http case.
import { describe, expect, it } from 'vitest'

import { bootCheck, sisterBaseUrl, type BootReport } from './index'
import { deployableConfig, fullEnv } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const config = deployableConfig()
const staging = config.sisters[0]!.baseUrl
const check = (env: Record<string, string | undefined>) => bootCheck({ env, config, now: NOW })
const originFindings = (report: BootReport) =>
  [...report.problems, ...report.warnings].filter((each) => each.subject === 'SISTER_BASE_URL')

describe('bootCheck() — the sister origin', () => {
  it('requires production to name its sister’s production site, never the staging one', () => {
    const unset = check({ ...fullEnv(config, 'production'), SISTER_BASE_URL: undefined })
    expect(unset.problems.filter((each) => each.subject === 'SISTER_BASE_URL')).toEqual([
      {
        subject: 'SISTER_BASE_URL',
        message: `is not set: production syncs with its sister's production site, and "${staging}" (sisters[0].baseUrl) is its staging site (DEPLOYMENT.md §8)`,
      },
    ])
    const committed = check({ ...fullEnv(config, 'production'), SISTER_BASE_URL: staging })
    expect(originFindings(committed)[0]?.message).toMatch(/^names the committed origin/)
    const own = { ...fullEnv(config, 'production'), SISTER_BASE_URL: 'https://shop.example.org' }
    expect(originFindings(check(own))).toEqual([])
    expect(sisterBaseUrl(own, config)).toBe('https://shop.example.org')
  })

  it('lets staging and a workstation use the committed staging site', () => {
    for (const environment of ['staging', 'local'] as const) {
      const env = fullEnv(config, environment)
      expect(originFindings(check(env)), environment).toEqual([])
      expect(sisterBaseUrl(env, config)).toBe(staging)
    }
  })

  it('lets a workstation reach a local sister over http on loopback, and nobody else', () => {
    const local = { ...fullEnv(config, 'local'), SISTER_BASE_URL: 'http://localhost:4170' }
    expect(originFindings(check(local))).toEqual([])
    expect(sisterBaseUrl(local, config)).toBe('http://localhost:4170')
    for (const [environment, url] of [
      ['staging', 'http://localhost:4170'],
      ['local', 'http://sister.example.com'],
      ['staging', 'https://sister.example.com/archive'],
      ['production', 'https://localhost:4170'],
    ] as const) {
      const report = check({ ...fullEnv(config, environment), SISTER_BASE_URL: url })
      expect(
        report.problems.filter((each) => each.subject === 'SISTER_BASE_URL'),
        `${environment} ${url}`,
      ).toHaveLength(1)
    }
  })

  it('says a stray SISTER_BASE_URL is ignored when the brand has no sister', () => {
    const alone = deployableConfig((raw) => {
      raw.sisters = []
      raw.modules['sister.links'] = false
    })
    const env = { ...fullEnv(alone, 'staging'), SISTER_BASE_URL: 'https://shop.example.org' }
    const report = bootCheck({ env, config: alone, now: NOW })
    expect(originFindings(report)).toEqual([
      {
        subject: 'SISTER_BASE_URL',
        message: 'is set, but the brand has no sister (sisters is empty): ignored',
      },
    ])
    expect(sisterBaseUrl(env, alone)).toBeNull()
  })
})

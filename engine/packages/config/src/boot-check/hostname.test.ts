import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, isLoopbackIp, normaliseHost } from './index'
import { deployableConfig, fullEnv } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const config = deployableConfig()
const ENVIRONMENTS = ['local', 'staging', 'production'] as const

const withHost = (environment: (typeof ENVIRONMENTS)[number], host: string | undefined) =>
  bootCheck({ env: { ...fullEnv(config, environment), HOSTNAME: host }, config, now: NOW })
const hostnameFinding = (report: ReturnType<typeof bootCheck>) =>
  report.problems.find((problem) => problem.subject === 'HOSTNAME')

/** Every spelling Next's URL parser reads as a loopback IP it renames to `localhost`. */
const LOOPBACK = ['127.0.0.1', '127.1', '2130706433', '0x7f.0.0.1', '127.255.255.254', '0177.0.0.1']
const LOOPBACK_V6 = ['::1', '[::1]', '0:0:0:0:0:0:0:1']
const BINDABLE = ['localhost', 'LOCALHOST', '0.0.0.0', 'ip-10-0-0-12', 'helios.internal', '::']

describe('the boot check refuses a loopback HOSTNAME (5.3.d; DEPLOYMENT.md §3)', () => {
  it('normalises the host the way Next reads it, bracketing a bare IPv6', () => {
    expect(normaliseHost('127.1')).toBe('127.0.0.1')
    expect(normaliseHost('2130706433')).toBe('127.0.0.1')
    expect(normaliseHost('0x7f.0.0.1')).toBe('127.0.0.1')
    expect(normaliseHost('::1')).toBe('[::1]')
    expect(normaliseHost('0:0:0:0:0:0:0:1')).toBe('[::1]')
    expect(normaliseHost('::ffff:127.0.0.1')).toBe('[::ffff:7f00:1]')
    expect(normaliseHost('LOCALHOST')).toBe('localhost')
    expect(normaliseHost('not a host')).toBeNull()
  })

  it('tests the normalised host as Next does: 127. and three octets, or [::1]', () => {
    for (const host of [...LOOPBACK, ...LOOPBACK_V6]) expect(isLoopbackIp(host), host).toBe(true)
    for (const host of BINDABLE) expect(isLoopbackIp(host), host).toBe(false)
    // Next does not rename an IPv4-mapped loopback, so it does not hang: not the rule.
    expect(isLoopbackIp('::ffff:127.0.0.1')).toBe(false)
    expect(isLoopbackIp('not a host')).toBe(false)
  })

  it('refuses every loopback spelling in every environment', () => {
    for (const environment of ENVIRONMENTS) {
      for (const host of [...LOOPBACK, ...LOOPBACK_V6]) {
        const report = withHost(environment, host)
        expect(report.ok, `${environment} ${host}`).toBe(false)
        expect(hostnameFinding(report), `${environment} ${host}`).toBeDefined()
      }
    }
  })

  it('passes localhost, 0.0.0.0, a host name, and no HOSTNAME at all', () => {
    for (const environment of ENVIRONMENTS) {
      for (const host of [...BINDABLE, undefined, '']) {
        const report = withHost(environment, host)
        expect(hostnameFinding(report), `${environment} ${host}`).toBeUndefined()
        expect(report.problems, formatBootReport(report)).toEqual([])
      }
    }
  })

  it('names server.js, which binds HOSTNAME, and says next dev/start take -H, which hangs too', () => {
    const message = hostnameFinding(withHost('production', '127.1'))?.message ?? ''
    expect(message).toMatch(/^is "127\.1", a loopback IP \(127\.0\.0\.1\)/)
    expect(message).toContain('the standalone server.js binds HOSTNAME')
    expect(message).toContain('next dev and next start ignore HOSTNAME and take -H')
    expect(message).toContain('which hangs at a loopback address too')
    expect(message).toContain('DEPLOYMENT.md §3')
    expect(formatBootReport(withHost('local', '::1'))).toMatch(
      /✗ HOSTNAME: is "::1", a loopback IP \(\[::1\]\)/,
    )
  })
})

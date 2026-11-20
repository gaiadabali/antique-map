import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const NOW = Date.parse('2026-10-20T08:00:00Z')

beforeAll(() => {
  process.env.PAYLOAD_SECRET ??= 'session-test-secret-never-signs-anything-real'
})

describe('the partner session cookie', () => {
  it('reads back the partner and version it was issued for', async () => {
    const { issuePartnerSession, readPartnerSession } = await import('./session')
    const value = issuePartnerSession(12, 4, NOW)
    expect(readPartnerSession(value, NOW + 1000)).toMatchObject({ id: 12, version: 4 })
  })

  it('refuses a changed id, version or expiry', async () => {
    const { issuePartnerSession, readPartnerSession } = await import('./session')
    const [, version, expires, mac] = issuePartnerSession(12, 4, NOW).split('.')
    expect(readPartnerSession(`13.${version}.${expires}.${mac}`, NOW)).toBeNull()
    expect(readPartnerSession(`12.5.${expires}.${mac}`, NOW)).toBeNull()
    expect(readPartnerSession(`12.${version}.${Number(expires) + 60}.${mac}`, NOW)).toBeNull()
  })

  it('refuses an expired or malformed value', async () => {
    const { issuePartnerSession, PARTNER_SESSION_SECONDS, readPartnerSession } =
      await import('./session')
    const value = issuePartnerSession(12, 4, NOW)
    expect(readPartnerSession(value, NOW + PARTNER_SESSION_SECONDS * 1000)).toBeNull()
    for (const bad of [undefined, '', 'a.b.c.d', '12.4', '12.4.99999999999.x']) {
      expect(readPartnerSession(bad, NOW)).toBeNull()
    }
  })
})

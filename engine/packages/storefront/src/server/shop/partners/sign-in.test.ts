import { describe, expect, it, vi } from 'vitest'

import { PARTNER_LOCK_MS, signInPartner, type SignInAccount, type SignInDeps } from './sign-in'

const NOW = Date.parse('2026-10-20T08:00:00Z')

const account = (extra: Partial<SignInAccount> = {}): SignInAccount => ({
  id: 7,
  status: 'active',
  enabled: true,
  passwordHash: 'HASH',
  failedAttempts: 0,
  lockedUntil: null,
  sessionVersion: 3,
  ...extra,
})

const deps = (found: SignInAccount | null, extra: Partial<SignInDeps> = {}) => {
  const record = vi.fn(async () => undefined)
  const verify = vi.fn(
    async (password: string, hash: string) => hash === 'HASH' && password === 'right',
  )
  return {
    record,
    verify,
    deps: {
      allow: () => true,
      find: async () => found,
      verify,
      unmatchable: 'NONE',
      record,
      now: () => NOW,
      ...extra,
    } satisfies SignInDeps,
  }
}

const input = (password: string, email = 'Shop@Example.com ') => ({
  email,
  password,
  ip: '1.2.3.4',
})

describe('a partner signs in', () => {
  it('lets the right password in, on the account’s session version', async () => {
    const { deps: d } = deps(account())
    expect(await signInPartner(d, input('right'))).toEqual({ ok: true, id: 7, version: 3 })
  })

  it('finds the account by its address in lower case', async () => {
    const find = vi.fn(async () => account())
    const { deps: d } = deps(null, { find })
    await signInPartner(d, input('right'))
    expect(find).toHaveBeenCalledWith('shop@example.com')
  })

  it('clears the counters after a good sign-in', async () => {
    const { deps: d, record } = deps(account({ failedAttempts: 2 }))
    await signInPartner(d, input('right'))
    expect(record).toHaveBeenCalledWith(7, { failedAttempts: 0, lockedUntil: null })
  })
})

describe('a partner sign-in is refused', () => {
  it('the same way for an unknown address, after the same work', async () => {
    const { deps: d, verify } = deps(null)
    expect(await signInPartner(d, input('right'))).toEqual({ ok: false, reason: 'invalid' })
    expect(verify).toHaveBeenCalledWith('right', 'NONE')
  })

  it('for an account the owner has not enabled, or has ended', async () => {
    for (const found of [account({ enabled: false }), account({ status: 'ended' })]) {
      const { deps: d } = deps(found)
      expect(await signInPartner(d, input('right'))).toEqual({ ok: false, reason: 'invalid' })
    }
  })

  it('counts a wrong password', async () => {
    const { deps: d, record } = deps(account({ failedAttempts: 1 }))
    expect(await signInPartner(d, input('wrong'))).toEqual({ ok: false, reason: 'invalid' })
    expect(record).toHaveBeenCalledWith(7, { failedAttempts: 2, lockedUntil: null })
  })

  it('locks the account for 15 minutes on the fifth wrong password', async () => {
    const { deps: d, record } = deps(account({ failedAttempts: 4 }))
    expect(await signInPartner(d, input('wrong'))).toEqual({ ok: false, reason: 'locked' })
    expect(record).toHaveBeenCalledWith(7, {
      failedAttempts: 0,
      lockedUntil: new Date(NOW + PARTNER_LOCK_MS).toISOString(),
    })
  })

  it('while locked, even with the right password', async () => {
    const lockedUntil = new Date(NOW + 60_000).toISOString()
    const { deps: d } = deps(account({ lockedUntil }))
    expect(await signInPartner(d, input('right'))).toEqual({ ok: false, reason: 'locked' })
  })

  it('past the per-address limit, before any account is read', async () => {
    const find = vi.fn(async () => account())
    const { deps: d } = deps(null, { allow: () => false, find })
    expect(await signInPartner(d, input('right'))).toEqual({ ok: false, reason: 'rate' })
    expect(find).not.toHaveBeenCalled()
  })

  it('with an empty field', async () => {
    const { deps: d } = deps(account())
    expect(await signInPartner(d, input(''))).toEqual({ ok: false, reason: 'missing' })
  })
})

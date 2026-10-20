import { describe, expect, it } from 'vitest'

import { hashPartnerPassword, UNMATCHABLE_HASH, verifyPartnerPassword } from './partner-password'
import { applySignIn } from './sign-in'

type HookArgs = Parameters<typeof applySignIn>[0]

const run = (data: Record<string, unknown>, before: Record<string, unknown> = {}) =>
  applySignIn({ data, originalDoc: { signIn: before }, req: {} } as unknown as HookArgs)

describe('a partner password', () => {
  it('is kept as a hash that only the same password matches', async () => {
    const hash = await hashPartnerPassword('a long enough passphrase')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(hash).not.toContain('passphrase')
    expect(await verifyPartnerPassword('a long enough passphrase', hash)).toBe(true)
    expect(await verifyPartnerPassword('a long enough passphrasE', hash)).toBe(false)
  })

  it('never matches the unmatchable hash or a malformed one', async () => {
    expect(await verifyPartnerPassword('', UNMATCHABLE_HASH)).toBe(false)
    expect(await verifyPartnerPassword('x', 'scrypt$1$1$1$a')).toBe(false)
    expect(await verifyPartnerPassword('x', 'plain')).toBe(false)
  })
})

describe('the partner sign-in hook', () => {
  it('hashes a new password, drops the plain one, clears the lock and ends old sessions', async () => {
    const out = (await run(
      {
        signIn: {
          enabled: true,
          email: ' Shop@Example.COM',
          newPassword: 'a long enough passphrase',
        },
      },
      { sessionVersion: 2, failedAttempts: 3, lockedUntil: '2026-10-20T08:00:00.000Z' },
    )) as { signIn: Record<string, unknown> }
    expect(out.signIn.newPassword).toBeUndefined()
    expect(String(out.signIn.passwordHash)).toMatch(/^scrypt\$/)
    expect(out.signIn).toMatchObject({
      email: 'shop@example.com',
      failedAttempts: 0,
      lockedUntil: null,
      sessionVersion: 3,
    })
  })

  it('refuses a short or common password', async () => {
    await expect(run({ signIn: { newPassword: 'short' } })).rejects.toThrow()
    await expect(run({ signIn: { newPassword: 'password1234' } })).rejects.toThrow()
  })

  it('keeps the stored hash when the form leaves it out', async () => {
    const out = (await run(
      { signIn: { enabled: true } },
      { passwordHash: 'scrypt$x', enabled: true },
    )) as {
      signIn: Record<string, unknown>
    }
    expect(out.signIn.passwordHash).toBe('scrypt$x')
  })

  it('ends every session when the owner turns sign-in off', async () => {
    const out = (await run(
      { signIn: { enabled: false } },
      { enabled: true, sessionVersion: 5 },
    )) as {
      signIn: Record<string, unknown>
    }
    expect(out.signIn.sessionVersion).toBe(6)
  })
})

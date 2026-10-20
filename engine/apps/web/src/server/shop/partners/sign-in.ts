/**
 * A partner's sign-in, away from Next so a test runs it on doubles: the per-address limit
 * (SECURITY.md §2.10: 10 an hour), then the account by its address, the lockout (A3: five wrong
 * passwords lock it for 15 minutes), the password against its scrypt hash — the same work for an
 * unknown address, so timing says nothing — and the counters. Every refusal but the limit and the
 * lockout reads the same, whether the address exists or not (A4).
 */
export const PARTNER_MAX_ATTEMPTS = 5
export const PARTNER_LOCK_MS = 15 * 60 * 1000

export type SignInAccount = {
  readonly id: number
  readonly status: string
  readonly enabled: boolean
  readonly passwordHash: string | null
  readonly failedAttempts: number
  readonly lockedUntil: string | null
  readonly sessionVersion: number
}

export type SignInDeps = {
  readonly allow: (ipKey: string) => boolean
  readonly find: (email: string) => Promise<SignInAccount | null>
  readonly verify: (password: string, hash: string) => Promise<boolean>
  /** A hash nothing matches, for the unknown address. */
  readonly unmatchable: string
  readonly record: (
    id: number,
    signIn: { failedAttempts: number; lockedUntil: string | null },
  ) => Promise<void>
  readonly now: () => number
}

export type SignInResult =
  | { readonly ok: true; readonly id: number; readonly version: number }
  | { readonly ok: false; readonly reason: 'invalid' | 'locked' | 'rate' | 'missing' }

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

export async function signInPartner(
  deps: SignInDeps,
  input: { readonly email: string; readonly password: string; readonly ip: string | null },
): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase()
  if (email === '' || input.password === '') return { ok: false, reason: 'missing' }
  if (!deps.allow(input.ip ?? 'unknown')) return { ok: false, reason: 'rate' }
  if (!EMAIL.test(email) || input.password.length > 200) {
    await deps.verify(input.password.slice(0, 200), deps.unmatchable)
    return { ok: false, reason: 'invalid' }
  }

  const account = await deps.find(email)
  const now = deps.now()
  if (account?.lockedUntil && Date.parse(account.lockedUntil) > now) {
    return { ok: false, reason: 'locked' }
  }
  const usable =
    account !== null &&
    account.enabled &&
    account.status !== 'ended' &&
    account.passwordHash !== null
  const matches = await deps.verify(
    input.password,
    usable ? (account.passwordHash as string) : deps.unmatchable,
  )
  if (!usable) return { ok: false, reason: 'invalid' }

  if (!matches) {
    const failed = account.failedAttempts + 1
    const lock = failed >= PARTNER_MAX_ATTEMPTS
    await deps.record(account.id, {
      failedAttempts: lock ? 0 : failed,
      lockedUntil: lock ? new Date(now + PARTNER_LOCK_MS).toISOString() : null,
    })
    return { ok: false, reason: lock ? 'locked' : 'invalid' }
  }
  if (account.failedAttempts !== 0 || account.lockedUntil !== null) {
    await deps.record(account.id, { failedAttempts: 0, lockedUntil: null })
  }
  return { ok: true, id: account.id, version: account.sessionVersion }
}

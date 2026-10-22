'use server'

/**
 * The partner sign-in's server actions (the partnership page's "Already a partner"). Server
 * actions refuse a cross-origin post (SECURITY.md B4); the form's two fields are all that is read.
 * Sign-out bumps the account's session version, so every device's cookie ends with it (A5).
 */
import 'server-only'

import { cookies, headers } from 'next/headers'

import { UNMATCHABLE_HASH, verifyPartnerPassword } from '@engine/cms/partners'

import { clientAddress } from '../../chat/identity'
import { PostLimiter } from '../../leads/rate'
import { currentPartner } from './current'
import { issuePartnerSession, partnerCookieOptions, PARTNER_COOKIE } from './session'
import { signInPartner } from './sign-in'
import { partnerByEmail, updateSignIn } from './store'

/** Ten sign-ins an hour from one address (SECURITY.md §2.10), on top of the account lockout. */
const limiter = new PostLimiter(10)

export type PartnerSignInState = {
  readonly status: 'idle' | 'error'
  readonly reason?: 'invalid' | 'locked' | 'rate' | 'missing' | 'unavailable'
  readonly email?: string
}

const field = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export async function partnerSignInAction(
  _previous: PartnerSignInState | null,
  form: FormData,
): Promise<PartnerSignInState> {
  const email = field(form, 'email').slice(0, 254)
  try {
    const result = await signInPartner(
      {
        allow: (key) => limiter.allow(key),
        find: partnerByEmail,
        verify: verifyPartnerPassword,
        unmatchable: UNMATCHABLE_HASH,
        record: updateSignIn,
        now: () => Date.now(),
      },
      { email, password: field(form, 'password'), ip: clientAddress(await headers()) },
    )
    if (!result.ok) return { status: 'error', reason: result.reason, email }
    ;(await cookies()).set(
      PARTNER_COOKIE,
      issuePartnerSession(result.id, result.version),
      partnerCookieOptions(),
    )
    return { status: 'idle' }
  } catch {
    return { status: 'error', reason: 'unavailable', email }
  }
}

export async function partnerSignOutAction(): Promise<void> {
  const partner = await currentPartner().catch(() => null)
  if (partner !== null) {
    await updateSignIn(partner.id, { sessionVersion: partner.version + 1 }).catch(() => undefined)
  }
  ;(await cookies()).delete(PARTNER_COOKIE)
}

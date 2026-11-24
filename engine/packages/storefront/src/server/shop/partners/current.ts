/**
 * The partner signed in on this request, or `null`: the cookie's signature and expiry
 * (`./session`), then the account itself — still able to sign in, not ended, and on the session
 * version the cookie was issued under. Read at request time, never cached.
 */
import 'server-only'

import { cookies } from 'next/headers'

import { PARTNER_COOKIE, readPartnerSession } from './session'
import { partnerById } from './store'

export type SignedInPartner = {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly version: number
}

export async function currentPartner(): Promise<SignedInPartner | null> {
  const session = readPartnerSession((await cookies()).get(PARTNER_COOKIE)?.value)
  if (session === null) return null
  const account = await partnerById(session.id)
  if (
    account === null ||
    !account.enabled ||
    account.status === 'ended' ||
    account.email === null ||
    account.sessionVersion !== session.version
  ) {
    return null
  }
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    version: account.sessionVersion,
  }
}

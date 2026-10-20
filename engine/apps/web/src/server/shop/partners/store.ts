/**
 * The partner sign-in's reads and writes. `partners` is owner-only, so these run with
 * `overrideAccess: true` and an explicit `select` of only the fields the sign-in needs (the
 * `site-settings` loader's pattern); nothing here is cached — a sign-in decides access.
 */
import 'server-only'

import { cms } from '@engine/cms/instance'

export type PartnerAccount = {
  readonly id: number
  readonly name: string
  readonly status: string
  readonly enabled: boolean
  readonly email: string | null
  readonly passwordHash: string | null
  readonly failedAttempts: number
  readonly lockedUntil: string | null
  readonly sessionVersion: number
}

const SELECT = {
  name: true,
  status: true,
  signIn: {
    enabled: true,
    email: true,
    passwordHash: true,
    failedAttempts: true,
    lockedUntil: true,
    sessionVersion: true,
  },
} as const

type Doc = {
  id: number
  name?: string | null
  status?: string | null
  signIn?: {
    enabled?: boolean | null
    email?: string | null
    passwordHash?: string | null
    failedAttempts?: number | null
    lockedUntil?: string | null
    sessionVersion?: number | null
  } | null
}

function accountOf(doc: Doc): PartnerAccount {
  return {
    id: doc.id,
    name: doc.name ?? '',
    status: doc.status ?? 'prospect',
    enabled: doc.signIn?.enabled === true,
    email: doc.signIn?.email ?? null,
    passwordHash: doc.signIn?.passwordHash ?? null,
    failedAttempts: Number(doc.signIn?.failedAttempts ?? 0),
    lockedUntil: doc.signIn?.lockedUntil ?? null,
    sessionVersion: Number(doc.signIn?.sessionVersion ?? 0),
  }
}

export async function partnerByEmail(email: string): Promise<PartnerAccount | null> {
  const payload = await cms()
  const found = await payload.find({
    collection: 'partners',
    where: { 'signIn.email': { equals: email } },
    select: SELECT,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const doc = found.docs[0] as Doc | undefined
  return doc ? accountOf(doc) : null
}

export async function partnerById(id: number): Promise<PartnerAccount | null> {
  const payload = await cms()
  try {
    const doc = (await payload.findByID({
      collection: 'partners',
      id,
      select: SELECT,
      depth: 0,
      overrideAccess: true,
    })) as Doc
    return accountOf(doc)
  } catch {
    return null
  }
}

/** Writes the sign-in counters (the collection's hook keeps the rest of the group). */
export async function updateSignIn(
  id: number,
  signIn: { failedAttempts?: number; lockedUntil?: string | null; sessionVersion?: number },
): Promise<void> {
  const payload = await cms()
  await payload.update({
    collection: 'partners',
    id,
    data: { signIn },
    depth: 0,
    overrideAccess: true,
  })
}

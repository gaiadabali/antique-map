/**
 * The two rules that keep a brand's admin administrable (TASKS.md 3.2.b):
 *
 * 1. **The first user is an admin.** New accounts default to `contributor` (drafts only), so the
 *    account Payload's create-first-user screen makes would otherwise leave nobody able to add
 *    staff. The count runs under a transaction-scoped advisory lock, so two first-user sign-ups
 *    racing on a fresh database make one admin, not two: the second waits for the first to
 *    commit, then counts it.
 * 2. **The last admin stays one.** Removing the role from — or deleting — the only admin is
 *    refused with a field error, for the same reason.
 *
 * Both run on every write path — the admin, REST, the Local API, a seed — because they are hooks,
 * not access rules (access is skipped by `overrideAccess`).
 */
import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type PayloadRequest,
} from 'payload'

import { advisoryLockKey } from '../../db/advisory-lock'
import { USERS_SLUG, type StaffRole } from '../../access/roles'

const FIRST_USER_LOCK_KEY = advisoryLockKey('engine/users/first-user')

type UserDoc = { id: number | string; roles?: unknown }

function holdsAdmin(roles: unknown): boolean {
  return Array.isArray(roles) && roles.includes('admin' satisfies StaffRole)
}

/** Serialises first-user creation inside the operation's own transaction (released at COMMIT). */
async function lockFirstUser(req: PayloadRequest): Promise<void> {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID === undefined ? undefined : db.sessions?.[transactionID]
  if (!session) return // no transaction to scope the lock to (a non-transactional adapter)
  type ExecuteArgs = Parameters<typeof db.execute>[0]
  await db.execute({
    db: session.db as ExecuteArgs['db'],
    raw: `SELECT pg_advisory_xact_lock(${FIRST_USER_LOCK_KEY})`,
  })
}

async function countAdmins(req: PayloadRequest, excludingId?: number | string): Promise<number> {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
    where: {
      and: [
        { roles: { in: ['admin'] } },
        ...(excludingId === undefined ? [] : [{ id: { not_equals: excludingId } }]),
      ],
    },
  })
  return totalDocs
}

function lastAdminError(req: PayloadRequest, id: number | string | undefined): ValidationError {
  return new ValidationError({
    collection: USERS_SLUG,
    ...(id === undefined ? {} : { id }),
    errors: [
      {
        path: 'roles',
        message:
          'This is the only admin. Make another user an admin first, so someone can still manage staff.',
      },
    ],
    req,
  })
}

export const firstUserIsAdmin: CollectionBeforeChangeHook<UserDoc> = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  await lockFirstUser(req)
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
  })
  return totalDocs === 0 ? { ...data, roles: ['admin'] } : data
}

export const keepAnAdminOnUpdate: CollectionBeforeChangeHook<UserDoc> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !('roles' in data)) return data
  if (!holdsAdmin(originalDoc?.roles) || holdsAdmin(data.roles)) return data
  const id = originalDoc?.id
  if ((await countAdmins(req, id)) === 0) throw lastAdminError(req, id)
  return data
}

export const keepAnAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doomed = await req.payload.findByID({
    collection: USERS_SLUG,
    id,
    depth: 0,
    overrideAccess: true,
    req,
    select: { roles: true },
  })
  if (holdsAdmin((doomed as { roles?: unknown }).roles) && (await countAdmins(req, id)) === 0) {
    throw lastAdminError(req, id)
  }
}

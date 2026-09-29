/**
 * The rules that keep a brand's admin administrable (TASKS.md 3.2.b; senior-db review of 3.2,
 * B1, S2), on every write path — the admin, REST, the Local API, a seed — because they are hooks
 * and a database trigger, not access rules (access is skipped by `overrideAccess`):
 *
 * 1. **The first user is an admin.** New accounts default to `contributor`, so the account the
 *    create-first-user screen makes would otherwise leave nobody able to add staff. Payload's
 *    first-register checks for users before this hook, unlocked, and creates with
 *    `overrideAccess: true`, so a racer that loses must be refused here: under the lock, a user
 *    already exists and this request is neither the Local API nor an admin's → Forbidden.
 * 2. **The last admin stays one.** Removing the role from — or deleting — the only admin is
 *    refused with a field error, per document (`beforeChange`, `beforeDelete`) and for a bulk
 *    `where` as a whole (`beforeOperation`: Payload runs a bulk operation's documents in parallel
 *    inside one transaction, where each would count the others as still admins).
 *
 * Every count runs under one transaction-scoped advisory lock, `ADMINS_LOCK_KEY`, so concurrent
 * operations are serialised: the second counts after the first has committed. The initial
 * migration's deferred constraint trigger on `users_roles` takes the same lock at commit and
 * refuses any transaction that leaves users and no admin — the backstop for a path no hook sees.
 */
import {
  Forbidden,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
  type Where,
} from 'payload'

import { hasRole, USERS_SLUG, type StaffRole } from '../../access/roles'
import { advisoryLockKey } from '../../db/advisory-lock'

/** Also written, as a literal, into the initial migration's `users_keep_an_admin()` trigger. */
export const ADMINS_LOCK_KEY = advisoryLockKey('engine/users/admins')

type UserDoc = { id: number | string; roles?: unknown }
type Id = number | string

function holdsAdmin(roles: unknown): boolean {
  return Array.isArray(roles) && roles.includes('admin' satisfies StaffRole)
}

/** Serialises every admin count inside the operation's own transaction (released at COMMIT). */
export async function lockAdmins(req: PayloadRequest): Promise<void> {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID === undefined ? undefined : db.sessions?.[transactionID]
  if (!session) return // no transaction to scope the lock to (a non-transactional adapter)
  type ExecuteArgs = Parameters<typeof db.execute>[0]
  await db.execute({
    db: session.db as ExecuteArgs['db'],
    raw: `SELECT pg_advisory_xact_lock(${ADMINS_LOCK_KEY})`,
  })
}

async function countAdmins(req: PayloadRequest, excluding: readonly Id[] = []): Promise<number> {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
    where: {
      and: [
        { roles: { in: ['admin'] } },
        ...(excluding.length === 0 ? [] : [{ id: { not_in: [...excluding] } }]),
      ],
    },
  })
  return totalDocs
}

function lastAdminError(req: PayloadRequest, id: Id | undefined): ValidationError {
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
  await lockAdmins(req)
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
  })
  if (totalDocs === 0) return { ...data, roles: ['admin'] }
  // Someone is already here: only the Local API (a seed, a script) or an admin adds staff. This
  // is what refuses the loser of a first-register race, which Payload lets through unlocked.
  if (req.payloadAPI !== 'local' && !hasRole(req.user, 'admin')) throw new Forbidden(req.t)
  return data
}

export const keepAnAdminOnUpdate: CollectionBeforeChangeHook<UserDoc> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !('roles' in data) || !holdsAdmin(originalDoc?.roles)) return data
  // Any save of an admin's roles, keeping admin or not: Payload rewrites them delete-then-insert,
  // so the deferred trigger fires and takes this lock at COMMIT. Taken here first — before the row
  // locks the save acquires — so two writers never wait on each other in opposite orders (R1).
  await lockAdmins(req)
  if (holdsAdmin(data.roles)) return data
  const id = originalDoc?.id
  if ((await countAdmins(req, id === undefined ? [] : [id])) === 0) throw lastAdminError(req, id)
  return data
}

export const keepAnAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await lockAdmins(req)
  const doomed = await req.payload.findByID({
    collection: USERS_SLUG,
    id,
    depth: 0,
    overrideAccess: true,
    req,
    select: { roles: true },
  })
  if (holdsAdmin((doomed as { roles?: unknown }).roles) && (await countAdmins(req, [id])) === 0) {
    throw lastAdminError(req, id)
  }
}

/**
 * A bulk update or delete (`where`, no `id`) judged as a whole: the admins it would remove,
 * against every admin it leaves. A single-document operation is left to the per-document hooks.
 */
export const keepAnAdminInBulk: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  const bulk = args as { id?: Id; where?: Where; data?: { roles?: unknown } }
  if (bulk.id !== undefined || bulk.where === undefined) return args
  if (operation !== 'delete' && operation !== 'update') return args
  if (operation === 'update' && (!bulk.data || !('roles' in bulk.data))) return args
  // Before any row lock, for the same reason as a single save (R1): a bulk write of roles may
  // rewrite an admin's, and the deferred trigger would otherwise take the lock last.
  await lockAdmins(req)
  if (operation === 'update' && holdsAdmin(bulk.data?.roles)) return args
  const { docs } = await req.payload.find({
    collection: USERS_SLUG,
    where: bulk.where,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
    select: { roles: true },
  })
  const targets = docs.map((doc) => doc.id as Id)
  const removesAnAdmin = docs.some((doc) => holdsAdmin((doc as { roles?: unknown }).roles))
  if (removesAnAdmin && (await countAdmins(req, targets)) === 0)
    throw lastAdminError(req, undefined)
  return args
}

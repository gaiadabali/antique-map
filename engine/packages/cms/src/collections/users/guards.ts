/**
 * The rules that keep the admin administrable (SECURITY.md A7; senior-db review of 3.2, B1, S2),
 * on every write path — the admin, REST, the Local API, a seed — because they are hooks and a
 * database trigger, not access rules (access is skipped by `overrideAccess`):
 *
 * 1. **The first user is an owner.** New accounts default to `editor`, so the account the
 *    create-first-user screen makes would otherwise leave nobody able to add staff. Payload's
 *    first-register checks for users before this hook, unlocked, and creates with
 *    `overrideAccess: true`, so a racer that loses must be refused here: under the lock, a user
 *    already exists and this request is neither the Local API nor an owner's → Forbidden.
 * 2. **The last owner stays one.** Taking the role from — or deleting — the only owner is refused
 *    with a field error, per document (`beforeChange`, `beforeDelete`) and for a bulk `where` as a
 *    whole (`beforeOperation`: Payload runs a bulk operation's documents in parallel inside one
 *    transaction, where each would count the others as still owners).
 *
 * Every count runs under one transaction-scoped advisory lock, `ADMINS_LOCK_KEY`, so concurrent
 * operations are serialised: the second counts after the first has committed. The migration's
 * deferred constraint trigger on `users` takes the same lock at commit and refuses any
 * transaction that leaves users and no owner — the backstop for a path no hook sees. The key's
 * name and value are the ones the trigger was written with (TASKS.md 2.5.a keeps them equal).
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

import { USERS_SLUG } from '../../access/roles'
import { advisoryLockKey } from '../../db/advisory-lock'
import { hasRole, type UserRole } from './roles'

/** Also written, as a literal, into the migration's `users_keep_an_owner()` trigger. */
export const ADMINS_LOCK_KEY = advisoryLockKey('engine/users/admins')

const OWNER: UserRole = 'owner'

type UserDoc = { id: number | string; role?: unknown }
type Id = number | string

const holdsOwner = (role: unknown): boolean => role === OWNER

/** Serialises every owner count inside the operation's own transaction (released at COMMIT). */
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

async function countOwners(req: PayloadRequest, excluding: readonly Id[] = []): Promise<number> {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
    where: {
      and: [
        { role: { equals: OWNER } },
        ...(excluding.length === 0 ? [] : [{ id: { not_in: [...excluding] } }]),
      ],
    },
  })
  return totalDocs
}

function lastOwnerError(req: PayloadRequest, id: Id | undefined): ValidationError {
  return new ValidationError({
    collection: USERS_SLUG,
    ...(id === undefined ? {} : { id }),
    errors: [
      {
        path: 'role',
        message:
          'This is the only owner. Make another user an owner first, so someone can still manage staff.',
      },
    ],
    req,
  })
}

export const firstUserIsOwner: CollectionBeforeChangeHook<UserDoc> = async ({
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
  if (totalDocs === 0) return { ...data, role: OWNER }
  // Someone is already here: only the Local API (a seed, a script) or an owner adds staff. This
  // is what refuses the loser of a first-register race, which Payload lets through unlocked.
  if (req.payloadAPI !== 'local' && !hasRole(req.user, OWNER)) throw new Forbidden(req.t)
  return data
}

export const keepAnOwnerOnUpdate: CollectionBeforeChangeHook<UserDoc> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !('role' in data) || !holdsOwner(originalDoc?.role)) return data
  // Any save of an owner's role, kept or not, takes the lock here — before the row lock the save
  // acquires — so a writer never holds the row and then waits on the lock while another holds
  // the lock and waits on the row (R1). The trigger fires only on a real demotion, but taking the
  // lock more often never reorders it.
  await lockAdmins(req)
  if (holdsOwner(data.role)) return data
  const id = originalDoc?.id
  if ((await countOwners(req, id === undefined ? [] : [id])) === 0) throw lastOwnerError(req, id)
  return data
}

export const keepAnOwnerOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await lockAdmins(req)
  const doomed = await req.payload.findByID({
    collection: USERS_SLUG,
    id,
    depth: 0,
    overrideAccess: true,
    req,
    select: { role: true },
  })
  if (holdsOwner((doomed as { role?: unknown }).role) && (await countOwners(req, [id])) === 0) {
    throw lastOwnerError(req, id)
  }
}

/**
 * A bulk update or delete (`where`, no `id`) judged as a whole: the owners it would remove,
 * against every owner it leaves. A single-document operation is left to the per-document hooks.
 */
export const keepAnOwnerInBulk: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  const bulk = args as { id?: Id; where?: Where; data?: { role?: unknown } }
  if (bulk.id !== undefined || bulk.where === undefined) return args
  if (operation !== 'delete' && operation !== 'update') return args
  if (operation === 'update' && (!bulk.data || !('role' in bulk.data))) return args
  // Before any row lock, for the same reason as a single save (R1).
  await lockAdmins(req)
  if (operation === 'update' && holdsOwner(bulk.data?.role)) return args
  const { docs } = await req.payload.find({
    collection: USERS_SLUG,
    where: bulk.where,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
    select: { role: true },
  })
  const targets = docs.map((doc) => doc.id as Id)
  const removesAnOwner = docs.some((doc) => holdsOwner((doc as { role?: unknown }).role))
  if (removesAnOwner && (await countOwners(req, targets)) === 0)
    throw lastOwnerError(req, undefined)
  return args
}

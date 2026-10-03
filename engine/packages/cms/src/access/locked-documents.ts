/**
 * Who reaches `payload-locked-documents` — the admin's "someone is editing this" records (TASKS.md
 * 3.5.d; senior-be review of 2.4). Payload adds the collection itself while it sanitises the
 * config, with `defaultAccess` on every operation: any signed-in user — store staff included —
 * could list every lock (which document of which collection, opened by whom) and delete or
 * re-point anyone's. A list of locks is also a list of document ids across collections a store
 * user may not read.
 *
 * - **The owner and the editors**: everything, as before — they edit across the admin and take
 *   over one another's documents.
 * - **Store staff**: read and remove **their own** locks only, by a `Where` on the lock's user, so
 *   the admin can release the lock a store user took on their order or stock row when they leave
 *   it. They never list, re-point or remove anyone else's, and never create one over the API
 *   (the admin creates locks on the server, `payload.db.create`, past access).
 * - **Anyone else**: nothing.
 *
 * Saving is unaffected: Payload checks a lock on update with `payload.db`, past access
 * (`checkDocumentLockStatus`), so a store user still cannot overwrite a document an editor holds.
 *
 * Payload offers no override for this collection's access and refuses a second collection with
 * its slug, so the access is set on the built config (`restrictLockedDocuments`), the way
 * `hooks/request-temp-files` amends the built endpoints — `buildEngineConfig` applies both.
 */
import type { Access, SanitizedConfig, Where } from 'payload'

import { hasRole, roleOf } from '../collections/users/roles'
import { USERS_SLUG } from './roles'

export const LOCKED_DOCUMENTS_SLUG = 'payload-locked-documents'

const ownerOrEditor: Access = ({ req }) => hasRole(req.user, 'owner', 'editor')

/** Owner and editors: every lock. Store staff: the locks they hold. Anyone else: none. */
export const ownLocks: Access = ({ req }) => {
  if (hasRole(req.user, 'owner', 'editor')) return true
  const id = req.user?.id
  if (roleOf(req.user) !== 'store' || id === undefined || id === null) return false
  const mine: Where = {
    and: [{ 'user.relationTo': { equals: USERS_SLUG } }, { 'user.value': { equals: id } }],
  }
  return mine
}

export const LOCKED_DOCUMENTS_ACCESS = {
  read: ownLocks,
  create: ownerOrEditor,
  update: ownerOrEditor,
  delete: ownLocks,
} as const

/** Puts `LOCKED_DOCUMENTS_ACCESS` on the built config's locks collection, if it has one. */
export function restrictLockedDocuments(config: SanitizedConfig): SanitizedConfig {
  const locks = config.collections.find((collection) => collection.slug === LOCKED_DOCUMENTS_SLUG)
  if (locks) locks.access = { ...locks.access, ...LOCKED_DOCUMENTS_ACCESS }
  return config
}

/**
 * Store staff's place in the access rules (CONTENT-MODEL.md §7; SECURITY.md §2.2): their own
 * store's orders and stock, the products and media they stock and ship — and nothing of the
 * catalogue, the content or the owner's records. Two helpers every collection can take:
 *
 * - `notForStoreStaff(access)` — `access`, except that a `store` user is refused before it is
 *   consulted. For the reads written for the public and the catalogue staff (`publishedOrStaff`),
 *   which would otherwise hand a signed-in store user what the public sees through the API.
 * - `ownStore(field)` — the owner and the editors every document; a store user a `Where` on
 *   their own store (`field` equals `users.store`), so lists, counts, lookups by id and updates
 *   or deletes by query are all scoped in the query (R2); a store user without a store, and
 *   anyone else, nothing.
 */
import type { Access, Where } from 'payload'

import { hasRole, roleOf, storeOf } from '../collections/users/roles'

export function notForStoreStaff(access: Access): Access {
  return (args) => (roleOf(args.req.user) === 'store' ? false : access(args))
}

export function ownStore(field = 'store'): Access {
  return ({ req }) => {
    if (hasRole(req.user, 'owner', 'editor')) return true
    if (roleOf(req.user) !== 'store') return false
    const store = storeOf(req.user)
    if (store === null) return false
    const where: Where = { [field]: { equals: store } }
    return where
  }
}

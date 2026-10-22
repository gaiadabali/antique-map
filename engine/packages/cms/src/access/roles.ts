/**
 * Who a request is, as access reads it (ARCHITECTURE.md §12, SECURITY.md §2.2, DR-10). Two
 * questions, kept apart because they have different answers for store staff:
 *
 * - `isStaffUser()` — the request is signed in as a `users` document: someone who may enter the
 *   admin, store staff included (they work their own store's orders and stock there). A signed-in
 *   account of any other collection is never one, whatever it carries.
 * - `isCatalogueStaff()` / `isStaff` — the owner or an editor: the people who keep the catalogue
 *   and the content, and the only ones who see drafts, `/versions` and staff-only fields
 *   (`media.master`, `translationStatus`, a work's location and cost). A `store` user is not one,
 *   nor is a `users` document with no known role: it fails closed.
 *
 * The roles themselves — `owner`, `editor`, `store`, one per person in `users.role` — and the
 * role predicates (`hasRole`, `staffWithRoles`, `isOwner`, `storeOf`, …) are the `users`
 * collection's (`../collections/users/roles`), re-exported from `@engine/cms/access`. This module
 * reads `req.user` structurally, imports nothing at runtime from there (that module imports this
 * one), and names the two catalogue roles itself, typed against the vocabulary.
 */
import type { Access } from 'payload'

import type { UserRole } from '../collections/users/roles'

/** The staff auth collection's slug — the admin's user collection. */
export const USERS_SLUG = 'users'

/** The roles that keep the catalogue and the content: everything a store user is not. */
export const CATALOGUE_ROLES = ['owner', 'editor'] as const satisfies readonly UserRole[]

/** What `req.user` may be: any auth collection's document, or nobody. */
export type RequestUser =
  | { readonly collection?: unknown; readonly role?: unknown; readonly store?: unknown }
  | null
  | undefined

/** Signed in as a `users` document: may enter the admin (store staff included). */
export function isStaffUser(user: RequestUser): boolean {
  return user != null && user.collection === USERS_SLUG
}

/** The owner or an editor — never store staff, never a user with no known role. */
export function isCatalogueStaff(user: RequestUser): boolean {
  return isStaffUser(user) && (CATALOGUE_ROLES as readonly unknown[]).includes(user?.role)
}

/** Collection-level: the owner or an editor (`isCatalogueStaff`). */
export const isStaff: Access = ({ req }) => isCatalogueStaff(req.user)

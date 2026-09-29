/**
 * Staff and their roles (ARCHITECTURE.md §12, CONTENT-MODEL.md §8). Staff are documents of the
 * `users` auth collection; a signed-in *customer* (the separate `customers` collection) is never
 * staff, whatever it carries — a buyer must never be one wrong role value away from an admin
 * session. The roles are C1's `STAFF_ROLES`, declared once in config; `admin` is the owner's.
 *
 * These read `req.user` structurally rather than through the generated types, so they hold
 * whatever collection signed the request in.
 */
import { STAFF_ROLES, type StaffRole } from '@engine/config/schema'
import type { Access, FieldAccess } from 'payload'

export { STAFF_ROLES, type StaffRole }

/** The staff auth collection's slug — the admin's user collection. */
export const USERS_SLUG = 'users'

/** The least that lets someone work (KOI): what a new account gets unless an admin says otherwise. */
export const DEFAULT_STAFF_ROLE: StaffRole = 'contributor'

/** What `req.user` may be: any auth collection's document, or nobody. */
export type RequestUser =
  { readonly collection?: unknown; readonly roles?: unknown } | null | undefined

export function isStaffUser(user: RequestUser): boolean {
  return user != null && user.collection === USERS_SLUG
}

/** A staff user's roles — only known role names, never whatever else the field held. */
export function rolesOf(user: RequestUser): readonly StaffRole[] {
  if (!isStaffUser(user) || !Array.isArray(user?.roles)) return []
  return user.roles.filter((role): role is StaffRole =>
    (STAFF_ROLES as readonly unknown[]).includes(role),
  )
}

export function hasRole(user: RequestUser, ...allowed: readonly StaffRole[]): boolean {
  const held = rolesOf(user)
  return allowed.some((role) => held.includes(role))
}

/** Any member of staff, whatever their role. */
export const isStaff: Access = ({ req }) => isStaffUser(req.user)

/** The owner's role: users, settings, what money does. */
export const isAdmin: Access = ({ req }) => hasRole(req.user, 'admin')

/** Staff holding one of `roles` (`admin` is not implied: list it where it belongs). */
export function staffWithRoles(...roles: readonly StaffRole[]): Access {
  return ({ req }) => hasRole(req.user, ...roles)
}

/** The field-level twin of `isAdmin`. */
export const adminOnlyField: FieldAccess = ({ req }) => hasRole(req.user, 'admin')

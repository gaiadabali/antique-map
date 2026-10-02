/**
 * The three roles (DR-10; TASKS.md Decisions → Roles; CONTENT-MODEL.md §6–§7; SECURITY.md §2.2),
 * one per person, in `users.role`:
 *
 * - `owner` — everything: staff, stores, settings, leads, partners, discounts and an antique's
 *   asking price. Several people may hold it; the last one can never lose it (`./guards` and the
 *   database trigger).
 * - `editor` — the owner's team: the catalogue, the content and every order.
 * - `store` — a store's staff: their own store's orders and stock only, through a `Where` on
 *   `users.store` (`storeOf()`), never by hiding menu items.
 *
 * These read `req.user` structurally — a `users` document, `role` and `store` on it — so they hold
 * whatever signed the request in. They are the role vocabulary of the `users` collection; the
 * generic helpers in `access/` (2.2's) follow it (TASKS.md 2.4's report).
 */
import type { Access, FieldAccess } from 'payload'

import { isStaffUser } from '../../access/roles'

export const USER_ROLES = ['owner', 'editor', 'store'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Who a new account is unless the owner says otherwise; the first account is an owner. */
export const DEFAULT_ROLE: UserRole = 'editor'

/** The admin's words for each role, in both of its languages (G15). */
export const ROLE_LABELS: Record<UserRole, { en: string; id: string }> = {
  owner: { en: 'Owner', id: 'Pemilik' },
  editor: { en: 'Editor', id: 'Editor' },
  store: { en: 'Store staff', id: 'Staf toko' },
}

/** What `req.user` may be: any auth collection's document, or nobody. */
export type SignedIn =
  | { readonly collection?: unknown; readonly role?: unknown; readonly store?: unknown }
  | null
  | undefined

/** A `users` document's role — a known one only, never whatever else the field held. */
export function roleOf(user: SignedIn): UserRole | null {
  if (!isStaffUser(user)) return null
  const role = user?.role
  return (USER_ROLES as readonly unknown[]).includes(role) ? (role as UserRole) : null
}

export function hasRole(user: SignedIn, ...allowed: readonly UserRole[]): boolean {
  const role = roleOf(user)
  return role !== null && allowed.includes(role)
}

/**
 * The store a `store` user works in, as an id — the relation as stored, or populated — or null
 * for anyone else. A store user without one sees nothing (the access rules compare with it).
 */
export function storeOf(user: SignedIn): number | string | null {
  if (roleOf(user) !== 'store') return null
  const store = user?.store
  if (typeof store === 'number' || typeof store === 'string') return store
  const id = (store as { id?: unknown } | null | undefined)?.id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

/** Users holding one of `roles`. `owner` is not implied: list it where it belongs. */
export function staffWithRoles(...roles: readonly UserRole[]): Access {
  return ({ req }) => hasRole(req.user, ...roles)
}

/** The owner's: staff, stores, settings and what money does. */
export const isOwner: Access = ({ req }) => hasRole(req.user, 'owner')

/** The field-level twin of `staffWithRoles`. */
export function rolesOnlyField(...roles: readonly UserRole[]): FieldAccess {
  return ({ req }) => hasRole(req.user, ...roles)
}

/** The field-level twin of `isOwner`. */
export const ownerOnlyField: FieldAccess = ({ req }) => hasRole(req.user, 'owner')

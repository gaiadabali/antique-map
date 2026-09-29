/**
 * Field-level access (CONTENT-MODEL.md §8, requirement 3.8). A work's `physical` (location,
 * export status), acquisition cost and consignor are staff-only: never in a public response,
 * never in a view model, never in a sister snapshot (C12). `staffOnly` goes on each such field's
 * `read`, `create` and `update`, so the REST API, the admin and every Local API call made
 * with `overrideAccess: false` drop it for anyone who is not staff.
 *
 * Field access is skipped by the Local API's default `overrideAccess: true` — which is why public
 * reads never use that default (`./published`).
 */
import type { Field, FieldAccess } from 'payload'

import { hasRole, isStaffUser, type StaffRole } from './roles'

export const staffOnly: FieldAccess = ({ req }) => isStaffUser(req.user)

/** Staff holding one of `roles` — for fields narrower than all staff (prices, refunds). */
export function rolesOnlyField(...roles: readonly StaffRole[]): FieldAccess {
  return ({ req }) => hasRole(req.user, ...roles)
}

/** The access block a staff-only field carries, in one piece so none of the three is forgotten. */
export const STAFF_ONLY_ACCESS = {
  create: staffOnly,
  read: staffOnly,
  update: staffOnly,
} as const satisfies NonNullable<Extract<Field, { access?: unknown }>['access']>

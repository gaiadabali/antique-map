/**
 * Field-level access (CONTENT-MODEL.md §8, requirement 3.8). A work's `physical` (location,
 * export status), acquisition cost and consignor, a media record's master, a translation's status
 * are staff-only: never in a public response, never in a view model. `staffOnly` goes on each
 * such field's `read`, `create` and `update`, so the REST API, the admin and every Local API call
 * made with `overrideAccess: false` drop it for anyone who is not the owner or an editor — a store
 * user included, who may enter the admin but keeps no catalogue (`./roles`).
 *
 * Field access is skipped by the Local API's default `overrideAccess: true` — which is why public
 * reads never use that default (`./published`). A field narrower still (an antique's asking
 * price, owner-only) takes `rolesOnlyField()` / `ownerOnlyField` from the role vocabulary.
 */
import type { Field, FieldAccess } from 'payload'

import { isCatalogueStaff } from './roles'

export const staffOnly: FieldAccess = ({ req }) => isCatalogueStaff(req.user)

/** The access block a staff-only field carries, in one piece so none of the three is forgotten. */
export const STAFF_ONLY_ACCESS = {
  create: staffOnly,
  read: staffOnly,
  update: staffOnly,
} as const satisfies NonNullable<Extract<Field, { access?: unknown }>['access']>

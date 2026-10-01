/**
 * Who reads and writes the discovery vocabulary (CONTENT-MODEL.md §8), shared by makers, places,
 * terms and sources.
 *
 * - **Read**: `DRAFTED_ACCESS` — the public sees published records only, staff see drafts, and
 *   only staff read `/versions` (`@engine/cms/access`, ARCHITECTURE.md §12). Loaders add their
 *   own `overrideAccess: false`, `_status: 'published'` and `select` on top.
 * - **Write**: the cataloguing roles — admin, manager, cataloguer — and the contributor, who
 *   saves drafts only: publishing is refused to a contributor by `refuseContributorPublish`, a
 *   hook, because access alone cannot guard the draft → published transition (KOI, §8).
 * - **Delete**: admin and manager. A maker, place, term or source is pointed at by works; a
 *   cataloguer merging duplicates re-points the works and leaves the delete to them.
 */
import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { DRAFTED_ACCESS } from '../../../access/published'
import { hasRole, isStaffUser, staffWithRoles, type StaffRole } from '../../../access/roles'

/** The roles that publish a vocabulary record. */
export const VOCABULARY_PUBLISHERS = [
  'admin',
  'manager',
  'cataloguer',
] as const satisfies readonly StaffRole[]

export const VOCABULARY_ACCESS = {
  ...DRAFTED_ACCESS,
  create: staffWithRoles(...VOCABULARY_PUBLISHERS, 'contributor'),
  update: staffWithRoles(...VOCABULARY_PUBLISHERS, 'contributor'),
  delete: staffWithRoles('admin', 'manager'),
} as const

/** The versions every vocabulary collection keeps: drafts, validated on every save. */
export const VOCABULARY_VERSIONS = {
  // `validate: true`: Payload would otherwise skip every field validator on a draft save, and
  // CONTENT-MODEL.md §9's every-save rules (dates in order, a valid address, a parent that is
  // no descendant) must hold on drafts too. What only publishing demands is checked against
  // `_status` in the validator itself (`./fields`, `requiredToPublish`).
  drafts: { validate: true },
} as const

/**
 * A contributor saves drafts; a signed-in member of staff without a publishing role who sends
 * `_status: 'published'` is refused. A write with no user — a seed, the migration importer, a
 * script — is not a person's publish and is left to its caller (they land drafts, §10).
 */
export const refuseContributorPublish: CollectionBeforeChangeHook = ({ data, req }) => {
  if ((data as { _status?: unknown })?._status !== 'published') return data
  if (!isStaffUser(req.user) || hasRole(req.user, ...VOCABULARY_PUBLISHERS)) return data
  throw new APIError(
    'Contributors save drafts. A cataloguer, a manager or an admin publishes it.',
    403,
    null,
    true,
  )
}

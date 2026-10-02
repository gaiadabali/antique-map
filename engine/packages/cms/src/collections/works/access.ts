/**
 * Who reaches a work and its private parts (TASKS.md 8.2.d; CONTENT-MODEL.md §8; requirements 3.8,
 * 3.11; COMPLIANCE.md §1).
 *
 * - **The record**: the discovery vocabulary's access (`VOCABULARY_ACCESS`) — `publishedOrStaff`
 *   reads with staff-only `/versions`, the cataloguing roles write and a contributor saves drafts
 *   (`refuseContributorPublish`), admin and manager delete. Loaders and the sister API add their own
 *   `overrideAccess: false`, `_status: 'published'` and `select` on top.
 * - **`physical`** — where the object is, its export status, whether a certificate went out — is
 *   staff-only and narrower still: those who catalogue, sell or ship it read it; those who catalogue
 *   or sell it set it from the owner's item register. An editor, an analyst or a contributor never
 *   sees it, nor does the public, by any API that checks access (`overrideAccess: false` included).
 * - **`physical.acquisition`** — who it came from and what it cost — is the owners' alone: admin
 *   and manager.
 * - **`cataloguing`** and **`legacy`** are internal (C12's private keys): staff only.
 *
 * Field access is skipped by the Local API's default `overrideAccess: true`, which is why no public
 * read uses that default (`access/published`).
 */
import type { FieldAccess } from 'payload'

import { rolesOnlyField } from '../../access/fields'
import type { StaffRole } from '../../access/roles'

export {
  refuseContributorPublish,
  VOCABULARY_ACCESS as WORKS_ACCESS,
  VOCABULARY_PUBLISHERS as WORK_PUBLISHERS,
  VOCABULARY_VERSIONS as WORKS_VERSIONS,
} from '../terms/vocabulary/access'

/** Who reads where an original is and where it may go. */
export const PHYSICAL_READERS = [
  'admin',
  'manager',
  'cataloguer',
  'fulfilment',
] as const satisfies readonly StaffRole[]
/** Who records it, from the owner's item register. */
export const PHYSICAL_WRITERS = [
  'admin',
  'manager',
  'cataloguer',
] as const satisfies readonly StaffRole[]
/** Who reads and records an acquisition: its source, cost and consignor. */
export const ACQUISITION_ROLES = ['admin', 'manager'] as const satisfies readonly StaffRole[]

type FieldAccessBlock = { create: FieldAccess; read: FieldAccess; update: FieldAccess }

export const PHYSICAL_ACCESS: FieldAccessBlock = {
  read: rolesOnlyField(...PHYSICAL_READERS),
  create: rolesOnlyField(...PHYSICAL_WRITERS),
  update: rolesOnlyField(...PHYSICAL_WRITERS),
}

export const ACQUISITION_ACCESS: FieldAccessBlock = {
  read: rolesOnlyField(...ACQUISITION_ROLES),
  create: rolesOnlyField(...ACQUISITION_ROLES),
  update: rolesOnlyField(...ACQUISITION_ROLES),
}

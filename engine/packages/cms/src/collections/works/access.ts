/**
 * Who reaches a work and its private parts (CONTENT-MODEL.md §7; SECURITY.md §2.2; requirements
 * 3.8, 3.11; COMPLIANCE.md §1).
 *
 * - **The record**: the catalogue's access (`VOCABULARY_ACCESS`) — `publishedOrStaff` reads with
 *   staff-only `/versions`; the owner and the editors write, publish and delete; store staff
 *   never write it. Loaders add their own `overrideAccess: false`, `_status: 'published'` and
 *   `select` on top.
 * - **`physical`** — the object's export status, whether a certificate went out — is the owner's
 *   and the editors' alone: no store user and no public read sees it, by any API that checks
 *   access (`overrideAccess: false` included).
 * - **`physical.acquisition`** — who it came from and what it cost — is the owner's alone, as is
 *   every figure of what money does (DR-10). TASKS.md 3.2.b's `askingPrice` follows the same rule.
 * - **`cataloguing`** and **`legacy`** are internal: staff only.
 *
 * Field access is skipped by the Local API's default `overrideAccess: true`, which is why no public
 * read uses that default (`access/published`).
 */
import type { FieldAccess } from 'payload'

import { rolesOnlyField, type UserRole } from '../users/roles'

export {
  VOCABULARY_ACCESS as WORKS_ACCESS,
  VOCABULARY_PUBLISHERS as WORK_PUBLISHERS,
  VOCABULARY_VERSIONS as WORKS_VERSIONS,
} from '../terms/vocabulary/access'

/** Who reads and records where an original may go, from the owner's item register. */
export const PHYSICAL_ROLES = ['owner', 'editor'] as const satisfies readonly UserRole[]
/** Who reads and records an acquisition: its source, cost and consignor. */
export const ACQUISITION_ROLES = ['owner'] as const satisfies readonly UserRole[]

type FieldAccessBlock = { create: FieldAccess; read: FieldAccess; update: FieldAccess }

const block = (roles: readonly UserRole[]): FieldAccessBlock => {
  const access = rolesOnlyField(...roles)
  return { read: access, create: access, update: access }
}

export const PHYSICAL_ACCESS: FieldAccessBlock = block(PHYSICAL_ROLES)
export const ACQUISITION_ACCESS: FieldAccessBlock = block(ACQUISITION_ROLES)
/** The asking price is the owner's alone, to read and to set (Q14; DR-10). */
export const OWNER_ONLY_ACCESS: FieldAccessBlock = block(['owner'])

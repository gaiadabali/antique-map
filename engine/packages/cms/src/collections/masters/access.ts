/**
 * Who reaches a `masters` record (CONTENT-MODEL.md §5, §7): the owner and the editors, never the
 * public and never store staff — a master is never publicly addressable, and its record carries
 * no URL. Both make and change records; removing one, which can orphan a published image's
 * provenance, is the owner's.
 */
import type { Access } from 'payload'

import { staffWithRoles, type UserRole } from '../users/roles'

/** The roles that read, make and change records — the upload step checks the same. */
export const MASTER_WRITERS = ['owner', 'editor'] as const satisfies readonly UserRole[]
export const writeMasters: Access = staffWithRoles(...MASTER_WRITERS)

export const MASTERS_ACCESS = {
  read: writeMasters,
  create: writeMasters,
  update: writeMasters,
  delete: staffWithRoles('owner'),
} as const

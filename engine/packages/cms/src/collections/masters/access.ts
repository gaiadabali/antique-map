/**
 * Who reaches a `masters` record (CONTENT-MODEL.md §6, §8): staff alone, never the public — a
 * master is never publicly addressable, and its record carries no URL. The catalogue's roles make
 * and change records; removing one, which can orphan a published image's provenance, is an
 * admin's.
 */
import type { Access } from 'payload'

import { isStaff, staffWithRoles } from '../../access/roles'

/** The roles that make and change records — the upload step checks the same. */
export const MASTER_WRITERS = ['admin', 'manager', 'cataloguer'] as const
export const writeMasters: Access = staffWithRoles(...MASTER_WRITERS)

export const MASTERS_ACCESS = {
  read: isStaff,
  create: writeMasters,
  update: writeMasters,
  delete: staffWithRoles('admin'),
} as const

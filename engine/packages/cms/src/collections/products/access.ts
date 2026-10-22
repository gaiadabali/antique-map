/**
 * Who reaches a product (CONTENT-MODEL.md §7; SECURITY.md §2.2):
 *
 * - **the public** reads published products only — through the shop's loaders, which add their
 *   own `overrideAccess: false`, `_status: 'published'` and `select` (AGENTS.md);
 * - **store staff** read every product, drafts included — to see what they stock and ship, and a
 *   product may arrive as a draft before it is published — but never `/versions`, and write none;
 * - **the owner and the editors** read, write, publish and delete, and read `/versions`.
 *
 * Built on the `users` roles (`../users/roles`) rather than `access/` (TASKS.md 2.2 and 3.5 own
 * that folder): a store user is a `users` document, so the catalogue's `DRAFTED_ACCESS` would
 * hand them `/versions` too.
 */
import type { Access, Where } from 'payload'

import { hasRole, staffWithRoles, type UserRole } from '../users/roles'

/** The roles that write, publish and delete a product. */
export const PRODUCT_WRITERS = ['owner', 'editor'] as const satisfies readonly UserRole[]

/** The filter every public read of a drafts collection runs under. */
export const PUBLISHED_ONLY: Where = { _status: { equals: 'published' } }

const writers = staffWithRoles(...PRODUCT_WRITERS)

/** Staff: every product. Anyone else: published ones. */
export const readProducts: Access = ({ req }) =>
  hasRole(req.user, 'owner', 'editor', 'store') ? true : PUBLISHED_ONLY

export const PRODUCTS_ACCESS = {
  read: readProducts,
  readVersions: writers,
  create: writers,
  update: writers,
  delete: writers,
} as const

/**
 * Who reaches a stock row (CONTENT-MODEL.md §7; SECURITY.md §2.2 R2):
 *
 * - **the owner** — every row: creates one (a product newly stocked at a store), re-points or
 *   deletes it;
 * - **an editor** — reads every row and enters the physical count at any store;
 * - **store staff** — read their own store's rows and enter their counts, nothing else. A `Where`
 *   on `store`, so a list, a count, a lookup by id and an update by query of another store's row
 *   all find nothing;
 * - **the public** — nothing: "in stock" is computed on the server.
 *
 * Nobody types `quantity` through the API (`QUANTITY_ACCESS`): a person enters the physical count
 * (`physicalCount`) and the server stores the count less the units held (`./count`). The order
 * code's atomic decrement and release write `quantity` in SQL; the import and the seed write it
 * through the same count rule.
 */
import type { Access, FieldAccess } from 'payload'

import { hasRole, isOwner, roleOf, storeOf } from '../users/roles'

/** Owner and editor: every row. Store staff: their store's. Anyone else: none. */
export const ownStoreRows: Access = ({ req }) => {
  if (hasRole(req.user, 'owner', 'editor')) return true
  if (roleOf(req.user) !== 'store') return false
  const store = storeOf(req.user)
  return store === null ? false : { store: { equals: store } }
}

export const STOCK_LEVELS_ACCESS = {
  read: ownStoreRows,
  create: isOwner,
  update: ownStoreRows,
  delete: isOwner,
} as const

const ownerOnly: FieldAccess = ({ req }) => hasRole(req.user, 'owner')
const nobody: FieldAccess = () => false

/** Which store, product and variant a row counts: set by the owner, never moved by anyone else. */
export const KEY_ACCESS = { create: ownerOnly, update: ownerOnly } as const

/** `quantity` is the server's: read by staff, written only through the count rule or in SQL. */
export const QUANTITY_ACCESS = { create: nobody, update: nobody } as const

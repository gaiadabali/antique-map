/**
 * Who reaches an order (CONTENT-MODEL.md §4, §7; SECURITY.md §2.2 R2–R3; TASKS.md 3.3.c — schema
 * and access only; the moves themselves are phases 6–7 and 3.5.c):
 *
 * - **Nobody creates or deletes one through the API.** An order is "written only by the server's
 *   order code and the staff actions it allows" (CONTENT-MODEL.md §4): it is priced on the server,
 *   takes stock atomically and opens a payment, none of which a REST `POST` could do — and a body
 *   it accepted would be a price taken from a request (AGENTS.md). A replacement order (§12) is one
 *   of those staff actions, built in phase 7. An order is never deleted: it is the record the
 *   payment ledger, the stock and the buyer's tracking link point at.
 * - **Read and update**: the owner and the editors every order; store staff their own store's,
 *   by a `Where` on `store`, so lists, counts, lookups and updates by query are scoped.
 * - **Field by field**: what the order was priced and sold with — lines, totals, discount, store,
 *   contact, delivery, payment, driver image, tracking — is the server's (`SERVER_ONLY`); a person
 *   moves the status (store staff one step forward only, `./status-moves`) and hands an order
 *   back with a reason (`needsAttention`). The tracking token's hash and a
 *   payment attempt's Snap token are never in any API response (`NEVER_EXPOSED`; COMMERCE.md §8).
 */
import type { Access, FieldAccess } from 'payload'

import { hasRole, roleOf, storeOf } from '../users/roles'

/** Owner and editor: every order. Store staff: their store's. Anyone else: none. */
export const ownStoreOrders: Access = ({ req }) => {
  if (hasRole(req.user, 'owner', 'editor')) return true
  if (roleOf(req.user) !== 'store') return false
  const store = storeOf(req.user)
  return store === null ? false : { store: { equals: store } }
}

const nobody: Access = () => false

export const ORDERS_ACCESS = {
  read: ownStoreOrders,
  create: nobody,
  update: ownStoreOrders,
  delete: nobody,
} as const

const nobodyField: FieldAccess = () => false
const anyStaff: FieldAccess = ({ req }) => hasRole(req.user, 'owner', 'editor', 'store')

/** Written by the server's order code (with access overridden), read by whoever reads the order. */
export const SERVER_ONLY = { create: nobodyField, update: nobodyField } as const

/** Never read, created or updated through the API: the server reads it with access overridden. */
export const NEVER_EXPOSED = {
  read: nobodyField,
  create: nobodyField,
  update: nobodyField,
} as const

/**
 * The status: moved by any member of staff who can update the order — which move each may make
 * (store staff one step forward only) is `./status-moves`, judged on every write path.
 */
export const STATUS_ACCESS = { create: nobodyField, update: anyStaff } as const

/** Handing an order back for reassignment: any staff member who can update the order. */
export const ATTENTION_ACCESS = { create: nobodyField, update: anyStaff } as const

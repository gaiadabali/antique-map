/**
 * Who is acting, read once from `req.user`: a member of staff with a known role and a whole-number
 * id, and — for store staff — their store as a number. Anything else is `null`, and every
 * fulfilment action refuses it (SECURITY.md §2.2: access is enforced in the core, not the UI).
 */
import { roleOf, storeOf, type UserRole } from '../../collections/users/roles'
import type { FulfilmentActor } from './types'

export type Staff = {
  readonly id: number
  readonly role: UserRole
  /** A store user's store; null for the owner and editors — and for a store user without one. */
  readonly store: number | null
}

const whole = (value: unknown): number | null => {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof number === 'number' && Number.isSafeInteger(number) && number > 0 ? number : null
}

export function staffOf(actor: FulfilmentActor): Staff | null {
  const role = roleOf(actor)
  const id = whole(actor?.id)
  if (role === null || id === null) return null
  return { id, role, store: role === 'store' ? whole(storeOf(actor)) : null }
}

/** The owner or an editor. */
export const isManager = (staff: Staff | null): staff is Staff =>
  staff !== null && (staff.role === 'owner' || staff.role === 'editor')

/** May `staff` act on an order of `store`: the owner and editors any, store staff their own. */
export const reaches = (staff: Staff, store: number): boolean =>
  staff.role !== 'store' || staff.store === store

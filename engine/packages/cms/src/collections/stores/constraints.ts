/**
 * The database's own guards for stores (CONVENTIONS.md §13; TASKS.md 3.3.b, 3.3.d), declared
 * through the constraint seam (`db/constraints`) so pushed databases carry them too:
 *
 * - **`stores_pin_in_indonesia`** and **`stores_active_has_address_and_pin`** — `./pin`'s rules,
 *   for every write path.
 * - **`users_store_staff_have_a_store`** — the store-deletion guard's backstop. `users.store_id`
 *   references `stores` with `ON DELETE SET NULL` (Payload's default), so deleting a store a
 *   store user works in would leave that user with no store and an empty, silent admin. With this
 *   check the delete itself fails, whatever path ran it. It sits on `users` but belongs to the
 *   store's rules, so it is declared here; `users/store-rule` is the same rule as a hook.
 */
import type { ConstraintSet } from '../../db/constraints'
import { INDONESIA_BOUNDS } from './pin'

const { lat, lng } = INDONESIA_BOUNDS

export const STORE_CONSTRAINTS: readonly ConstraintSet[] = [
  {
    table: 'stores',
    checks: {
      stores_pin_in_indonesia: `(lat IS NULL OR lat BETWEEN ${lat.min} AND ${lat.max}) AND (lng IS NULL OR lng BETWEEN ${lng.min} AND ${lng.max})`,
      stores_active_has_address_and_pin: `active IS NOT TRUE OR (lat IS NOT NULL AND lng IS NOT NULL AND address IS NOT NULL AND btrim(address) <> '')`,
    },
  },
  {
    table: 'users',
    checks: {
      users_store_staff_have_a_store: `role <> 'store' OR store_id IS NOT NULL`,
    },
  },
]

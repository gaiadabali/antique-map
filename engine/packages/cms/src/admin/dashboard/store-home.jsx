/**
 * Store staff's admin home is their order panel (TASKS.md 10.8.c; the 10.4 proxy run: they landed
 * on a dashboard whose only way to an order was a small link). Payload has no per-role home, but
 * the dashboard renders `admin.components.beforeDashboard` first, with the signed-in `user`, so
 * this server component sends a store user straight to `/admin/orders` and renders nothing for
 * anyone else. A redirect, not a hidden dashboard: the owner and editor are untouched.
 * `.jsx`: see `../widgets/dashboard.jsx`'s header.
 */
import { redirect } from 'next/navigation'

import { hasRole } from '../../collections/users/roles'

export const STORE_HOME = '/admin/orders'

export async function StoreHomeRedirect({ user }) {
  if (hasRole(user, 'store')) redirect(STORE_HOME)
  return null
}

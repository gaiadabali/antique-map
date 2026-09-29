/**
 * `users` — staff, and only staff (ARCHITECTURE.md §12, CONTENT-MODEL.md §8, TASKS.md 3.2.b).
 * Customers are a separate auth collection (`customers`) with their own session cookie, so a
 * buyer is never one wrong role value away from an admin session.
 *
 * - **Roles**: C1's seven `STAFF_ROLES`, several per person (a small team wears two hats), new
 *   accounts `contributor` — the least that lets someone work. Only an admin changes a role.
 * - **First user**: Payload's create-first-user screen makes an admin, a losing racer is refused,
 *   and the last admin can neither lose the role nor be deleted — one document or in bulk
 *   (`./guards`, and the initial migration's constraint trigger on `users_roles`).
 * - **Lockout**: five failed sign-ins lock the account for fifteen minutes; an admin can unlock
 *   it sooner (ARCHITECTURE.md §13: the admin sits on a public path).
 * - Staff see and edit themselves; an admin sees and manages everyone.
 */
import type { Access, CollectionConfig } from 'payload'

import { hasRole, isAdmin, isStaffUser, type USERS_SLUG } from '../../access/roles'
import {
  firstUserIsAdmin,
  keepAnAdminInBulk,
  keepAnAdminOnDelete,
  keepAnAdminOnUpdate,
} from './guards'
import { rolesField } from './roles-field'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_TIME_MS = 15 * 60 * 1000

/** An admin: everyone. Other staff: their own account. Anyone else: nothing. */
const selfOrAdmin: Access = ({ req }) => {
  if (hasRole(req.user, 'admin')) return true
  if (!isStaffUser(req.user) || req.user?.id === undefined) return false
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  // Literal on purpose: route parity reads collection slugs from these files
  // (engine/tooling/route-parity/collections.mjs); `satisfies` keeps it equal to USERS_SLUG.
  slug: 'users' satisfies typeof USERS_SLUG,
  labels: { singular: 'Staff member', plural: 'Staff' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'roles'],
    description: 'Who can sign in to this admin, and what each person may do.',
  },
  auth: {
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockTime: LOCK_TIME_MS,
    useSessions: true,
    cookies: {
      sameSite: 'Lax',
      // A production build serves https (localhost counts as secure to a browser).
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    admin: ({ req }) => isStaffUser(req.user),
    create: isAdmin,
    read: selfOrAdmin,
    update: selfOrAdmin,
    delete: isAdmin,
    unlock: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'As colleagues know you — shown on the records you change.' },
    },
    rolesField,
  ],
  hooks: {
    beforeOperation: [keepAnAdminInBulk],
    beforeChange: [firstUserIsAdmin, keepAnAdminOnUpdate],
    beforeDelete: [keepAnAdminOnDelete],
  },
}

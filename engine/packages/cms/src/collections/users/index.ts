/**
 * `users` — the only people who sign in (SECURITY.md A1; CONTENT-MODEL.md §6). No visitor, buyer
 * or partner has an account.
 *
 * - **Roles** (`./roles`): `owner`, `editor` or `store`, one per person; new accounts are editors.
 *   A store user has exactly one store (`./store-rule`). Only the owner sets a role or a store.
 * - **First user**: Payload's create-first-user screen makes an owner, a losing racer is refused,
 *   and the last owner can neither lose the role nor be deleted — one document or in bulk
 *   (`./guards`, and the migration's constraint trigger on `users`).
 * - **Lockout**: five failed sign-ins lock the account for fifteen minutes; the owner can unlock
 *   it sooner (SECURITY.md A3: the admin sits on a public path).
 * - Editors and store staff see and edit themselves — their name and password, never their email,
 *   role or store (`./self-edit`, `./roles-field`); the owner sees and manages everyone
 *   (CONTENT-MODEL.md §7).
 * - **Role and store changes are recorded** (`./access-changes`, SECURITY.md R7): who, when, from
 *   what to what — read by the owner alone.
 */
import type { Access, CollectionConfig } from 'payload'

import { isStaffUser, type USERS_SLUG } from '../../access/roles'
import { accessChangesField, recordAccessChanges } from './access-changes'
import {
  firstUserIsOwner,
  keepAnOwnerInBulk,
  keepAnOwnerOnDelete,
  keepAnOwnerOnUpdate,
} from './guards'
import { roleField, storeField } from './roles-field'
import { hasRole, isOwner } from './roles'
import { ownerChangesEmail } from './self-edit'
import { oneStoreForStoreStaff } from './store-rule'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_TIME_MS = 15 * 60 * 1000

/** The owner: everyone. Other staff: their own account. Anyone else: nothing. */
const selfOrOwner: Access = ({ req }) => {
  if (hasRole(req.user, 'owner')) return true
  if (!isStaffUser(req.user) || req.user?.id === undefined) return false
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  // Literal on purpose: `registries/registries.test.ts` reads each slug from its own file;
  // `satisfies` keeps it equal to USERS_SLUG.
  slug: 'users' satisfies typeof USERS_SLUG,
  labels: {
    singular: { en: 'Staff member', id: 'Anggota staf' },
    plural: { en: 'Staff', id: 'Staf' },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role', 'store'],
    description: {
      en: 'Who can sign in to this admin, and what each person may do.',
      id: 'Siapa yang dapat masuk ke admin ini, dan apa yang boleh dilakukan setiap orang.',
    },
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
    create: isOwner,
    read: selfOrOwner,
    update: selfOrOwner,
    delete: isOwner,
    unlock: isOwner,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: { en: 'Name', id: 'Nama' },
      required: true,
      admin: {
        description: {
          en: 'As colleagues know you — shown on the records you change.',
          id: 'Seperti rekan kerja mengenal Anda — ditampilkan pada catatan yang Anda ubah.',
        },
      },
    },
    roleField,
    storeField,
    accessChangesField,
  ],
  hooks: {
    beforeOperation: [keepAnOwnerInBulk],
    beforeChange: [
      firstUserIsOwner,
      ownerChangesEmail,
      oneStoreForStoreStaff,
      keepAnOwnerOnUpdate,
      // Last: records the role and store as they will be saved (SECURITY.md R7).
      recordAccessChanges,
    ],
    beforeDelete: [keepAnOwnerOnDelete],
  },
}

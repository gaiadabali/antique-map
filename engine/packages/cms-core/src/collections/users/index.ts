/**
 * The `users` collection factory — the only people who sign in to a CMS's admin (SECURITY.md A1;
 * CONTENT-MODEL.md §6). No visitor, buyer or partner has an account.
 *
 * - **Roles** (`../../access/user-roles`): one per person, from the roles the CMS offers — the
 *   shop `owner`, `editor`, `store`; the gallery `owner`, `editor` (PLAN-V2.md §4.1). New accounts
 *   are editors. Only the owner sets a role. With `store`, a store user has exactly one store
 *   (`./store-rule`), which only the owner sets, and the store is part of the access record.
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
 * - **Added, reset, switched off** (TASKS.md 27.6.c): the owner adds a person on the staff list
 *   with a password of the owner's choosing, and resets one by typing a new one on that person's
 *   page (Payload's own "Change password", which `update` lets the owner use on anyone); an
 *   account is switched off, not deleted, and then neither signs in nor holds a session
 *   (`./switch-off`).
 */
import type { Access, CollectionConfig } from 'payload'

import { hiddenFromAllButCatalogueStaff } from '../../access/hidden'
import { isStaffUser, USERS_SLUG } from '../../access/roles'
import { hasRole, isOwner, type UserRole } from '../../access/user-roles'
import type { Bilingual } from '../../i18n'
import type { AdminGroup } from '../options'
import { accessChangesFieldFor, recordingAccessChanges } from './access-changes'
import {
  firstUserIsOwner,
  keepAnOwnerInBulk,
  keepAnOwnerOnDelete,
  keepAnOwnerOnUpdate,
} from './guards'
import { enforcePasswordPolicy } from './password-policy'
import { roleFieldFor, storeField } from './roles-field'
import { ownerChangesEmail } from './self-edit'
import { oneStoreForStoreStaff } from './store-rule'
import { activeField, refuseSwitchedOff, signOutWhenSwitchedOff } from './switch-off'

export {
  accessChangesField,
  accessChangesFieldFor,
  recordAccessChanges,
  recordingAccessChanges,
} from './access-changes'
export { isCommonPassword } from './common-passwords'
export {
  ADMINS_LOCK_KEY,
  firstUserIsOwner,
  keepAnOwnerInBulk,
  keepAnOwnerOnDelete,
  keepAnOwnerOnUpdate,
} from './guards'
export {
  enforcePasswordPolicy,
  MIN_PASSWORD_LENGTH,
  PASSWORD_MESSAGES,
  passwordProblem,
} from './password-policy'
export { defaultRole, ROLE_NOTES, roleField, roleFieldFor, storeField } from './roles-field'
export { ownerChangesEmail } from './self-edit'
export { oneStoreForStoreStaff } from './store-rule'
export {
  activeField,
  refuseSwitchedOff,
  signOutWhenSwitchedOff,
  SWITCHED_OFF_MESSAGE,
} from './switch-off'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_TIME_MS = 15 * 60 * 1000

export type UsersOptions = {
  /** The admin sidebar group (the CMS's own labels). */
  readonly group: AdminGroup
  /** The roles this CMS's staff hold, in the order the role select lists them. */
  readonly roles: readonly UserRole[]
  /** The CMS's own words for what a role may do, in place of `ROLE_NOTES`. */
  readonly roleNotes?: Partial<Record<UserRole, Bilingual>>
  /** Admin components above the staff list (import-map paths): the CMS's quick add-staff button. */
  readonly beforeList?: readonly string[]
}

/** The owner: everyone. Other staff: their own account. Anyone else: nothing. */
const selfOrOwner: Access = ({ req }) => {
  if (hasRole(req.user, 'owner')) return true
  if (!isStaffUser(req.user) || req.user?.id === undefined) return false
  return { id: { equals: req.user.id } }
}

export function usersCollection(
  options: UsersOptions,
): CollectionConfig & { slug: typeof USERS_SLUG } {
  const stores = options.roles.includes('store')
  return {
    slug: USERS_SLUG,
    labels: {
      singular: { en: 'Staff member', id: 'Anggota staf' },
      plural: { en: 'Staff', id: 'Staf' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButCatalogueStaff,
      useAsTitle: 'email',
      defaultColumns: ['name', 'email', 'role', ...(stores ? ['store'] : []), 'active'],
      ...(options.beforeList ? { components: { beforeList: [...options.beforeList] } } : {}),
      description: {
        en: 'Who can sign in to this admin, and what each person may do.',
        id: 'Siapa yang dapat masuk ke admin ini, dan apa yang boleh dilakukan setiap orang.',
      },
    },
    auth: {
      maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
      lockTime: LOCK_TIME_MS,
      useSessions: true,
      // The documented 8 hours (SECURITY.md A6); Payload's default is 2.
      tokenExpiration: 8 * 60 * 60,
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
      roleFieldFor(options.roles, options.roleNotes),
      ...(stores ? [storeField] : []),
      activeField,
      accessChangesFieldFor(options.roles, { stores }),
    ],
    hooks: {
      beforeOperation: [keepAnOwnerInBulk],
      beforeValidate: [enforcePasswordPolicy],
      beforeChange: [
        firstUserIsOwner,
        ownerChangesEmail,
        signOutWhenSwitchedOff,
        ...(stores ? [oneStoreForStoreStaff] : []),
        keepAnOwnerOnUpdate,
        // Last: records the role and store as they will be saved (SECURITY.md R7).
        recordingAccessChanges({ stores }),
      ],
      beforeDelete: [keepAnOwnerOnDelete],
      beforeLogin: [refuseSwitchedOff],
    },
  }
}

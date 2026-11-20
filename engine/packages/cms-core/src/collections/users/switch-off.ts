/**
 * An account the owner switches off (TASKS.md 27.6.c; the plan's §3.9): `users.active`. A person
 * who leaves keeps their name on the records they changed, so the account stays and is switched
 * off rather than deleted. Off means off on every path:
 *
 * - **No role** — `isStaffUser()` (`../../access/roles`) reads `active: false` as nobody, so every
 *   access rule, the admin's own `access.admin` included, refuses a session that outlived it;
 * - **Signed out** — switching an account off empties its sessions (`useSessions`), so its cookie
 *   stops working at the next request;
 * - **No sign-in** — sign-in and a password reset (Payload runs `beforeLogin` for both) refuse it
 *   with a plain message.
 *
 * Only the owner sets it (field access), and never on their own account: an owner could otherwise
 * lock everyone out, the last owner included.
 */
import {
  APIError,
  ValidationError,
  type CheckboxField,
  type CollectionBeforeChangeHook,
  type CollectionBeforeLoginHook,
} from 'payload'

import { USERS_SLUG } from '../../access/roles'
import { ownerOnlyField } from '../../access/user-roles'

export const SWITCHED_OFF_MESSAGE =
  'This account is switched off. Ask the owner to switch it on again.'

export const activeField: CheckboxField = {
  name: 'active',
  type: 'checkbox',
  defaultValue: true,
  label: { en: 'Account switched on', id: 'Akun aktif' },
  access: { create: ownerOnlyField, update: ownerOnlyField },
  admin: {
    position: 'sidebar',
    description: {
      en: 'Untick to switch the account off: the person is signed out and cannot sign in. Their name stays on what they changed.',
      id: 'Hapus centang untuk menonaktifkan akun: orang ini dikeluarkan dan tidak bisa masuk. Namanya tetap pada yang pernah diubahnya.',
    },
  },
}

type UserData = { id?: number | string; active?: unknown; sessions?: unknown }

/** Switching an account off signs it out everywhere; switching off your own is refused. */
export const signOutWhenSwitchedOff: CollectionBeforeChangeHook<
  UserData & { id: number | string }
> = ({ data, operation, originalDoc, req }) => {
  if (operation !== 'update' || data.active !== false || originalDoc?.active === false) return data
  const self =
    req.user?.collection === USERS_SLUG && String(req.user.id) === String(originalDoc?.id)
  if (self) {
    throw new ValidationError(
      {
        collection: USERS_SLUG,
        ...(originalDoc?.id === undefined ? {} : { id: originalDoc.id }),
        errors: [
          { path: 'active', message: 'You cannot switch off your own account: ask another owner.' },
        ],
        req,
      },
      req.t,
    )
  }
  return { ...data, sessions: [] }
}

/** A switched-off account neither signs in nor signs itself in by resetting its password. */
export const refuseSwitchedOff: CollectionBeforeLoginHook = ({ user }) => {
  if ((user as { active?: unknown } | undefined)?.active === false) {
    throw new APIError(SWITCHED_OFF_MESSAGE, 401, undefined, true)
  }
  return user
}

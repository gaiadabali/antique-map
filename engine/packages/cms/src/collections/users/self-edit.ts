/**
 * What staff may change on their own account (CONTENT-MODEL.md §7: "own name, language,
 * password"): an editor or a store user who reaches their own record (`selfOrOwner`) may not
 * change its email — the address the owner gave the account, and its sign-in. `role` and
 * `store` are guarded at the field (owner-only access, `./roles-field`), which keeps the stored
 * value; the email is an auth field Payload adds itself, so its guard is this hook, on every
 * write path that carries a user. The owner may change anyone's; a script with no user, too.
 * Language is TASKS.md 3.6's field.
 */
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { USERS_SLUG } from '../../access/roles'
import { hasRole } from './roles'

type UserData = { id: number | string; email?: unknown }

const normalised = (email: unknown) =>
  typeof email === 'string' ? email.trim().toLowerCase() : email

export const ownerChangesEmail: CollectionBeforeChangeHook<UserData> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !req.user || hasRole(req.user, 'owner')) return data
  if (!('email' in data) || normalised(data.email) === normalised(originalDoc?.email)) return data
  throw new ValidationError(
    {
      collection: USERS_SLUG,
      ...(originalDoc?.id === undefined ? {} : { id: originalDoc.id }),
      errors: [
        {
          path: 'email',
          message: 'Only the owner changes a staff member’s email: ask them to.',
        },
      ],
      req,
    },
    req.t,
  )
}

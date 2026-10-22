/**
 * A `store` user has exactly one store; nobody else has one (CONTENT-MODEL.md §8: "a `store` user
 * has exactly one store"). A hook, on every write path, judged on the user as it will be saved:
 *
 * - a `store` user without a store is refused, naming the field — such a user would see nothing,
 *   and the access rules compare every order and stock row with `users.store`;
 * - any other role's store is cleared, so an owner who moves a store user to editor need not
 *   empty the field first, and no stale store id waits to come back with the role.
 */
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { USERS_SLUG } from '../../access/roles'

type UserData = { id: number | string; role?: unknown; store?: unknown }

const isSet = (value: unknown) => value !== undefined && value !== null && value !== ''

export const oneStoreForStoreStaff: CollectionBeforeChangeHook<UserData> = ({
  data,
  originalDoc,
  req,
}) => {
  const role = 'role' in data ? data.role : originalDoc?.role
  const store = 'store' in data ? data.store : originalDoc?.store
  if (role === 'store') {
    if (isSet(store)) return data
    throw new ValidationError(
      {
        collection: USERS_SLUG,
        errors: [
          {
            path: 'store',
            message: 'Choose the store this person works in: store staff see only their store.',
          },
        ],
        req,
      },
      req.t,
    )
  }
  return isSet(store) ? { ...data, store: null } : data
}

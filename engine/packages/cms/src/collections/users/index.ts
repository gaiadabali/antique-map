/**
 * `users` — the one CMS's staff (SECURITY.md A1; CONTENT-MODEL.md §6), from the shared factory
 * (`@engine/cms-core/collections/users`): every role — `owner`, `editor` and `store` — so a store
 * user works in exactly one store, and role and store changes are recorded. The rules themselves
 * (the first user, the last owner, the lockout, self-edit, the password policy) are the factory's.
 */
import { USER_ROLES } from '@engine/cms-core/access'
import { usersCollection } from '@engine/cms-core/collections/users'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'

export { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS } from '@engine/cms-core/collections/users'

// The slug is written here as a literal (`registries/registries.test.ts` reads each slug from its
// own file); the factory's type keeps it equal to USERS_SLUG.
export const Users = usersCollection({
  group: ADMIN_GROUPS.settings,
  roles: USER_ROLES,
  // The owner's quick "Add a staff member" above the list (TASKS.md 27.6.c).
  beforeList: ['@engine/cms/admin/views#AddStaffButton'],
}) satisfies { slug: 'users' }

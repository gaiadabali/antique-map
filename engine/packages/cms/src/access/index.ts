/**
 * Access helpers every collection uses (TASKS.md 3.2.b). `@engine/cms/access`.
 */
export { rolesOnlyField, STAFF_ONLY_ACCESS, staffOnly } from './fields'
export { siteOrigin, trustedOrigins } from './origins'
export { DRAFTED_ACCESS, PUBLISHED_ONLY, publishedOrStaff } from './published'
export {
  adminOnlyField,
  DEFAULT_STAFF_ROLE,
  hasRole,
  isAdmin,
  isStaff,
  isStaffUser,
  rolesOf,
  STAFF_ROLES,
  staffWithRoles,
  USERS_SLUG,
  type RequestUser,
  type StaffRole,
} from './roles'

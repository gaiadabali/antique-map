/**
 * Access helpers every collection uses — `@engine/cms/access`: who may enter the admin and who
 * keeps the catalogue (`./roles`), staff-only fields (`./fields`), published-only reads
 * (`./published`), the origins Payload trusts (`./origins`), and the role vocabulary of the
 * `users` collection, re-exported (`owner`, `editor`, `store`).
 */
export { STAFF_ONLY_ACCESS, staffOnly } from './fields'
export { siteOrigin, trustedOrigins } from './origins'
export { DRAFTED_ACCESS, PUBLISHED_ONLY, publishedOrStaff } from './published'
export {
  CATALOGUE_ROLES,
  isCatalogueStaff,
  isStaff,
  isStaffUser,
  USERS_SLUG,
  type RequestUser,
} from './roles'
export {
  DEFAULT_ROLE,
  hasRole,
  isOwner,
  ownerOnlyField,
  roleOf,
  rolesOnlyField,
  staffWithRoles,
  storeOf,
  USER_ROLES,
  type UserRole,
} from '../collections/users/roles'

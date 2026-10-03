/**
 * Access helpers every collection uses — `@engine/cms/access`: who may enter the admin and who
 * keeps the catalogue (`./roles`), staff-only fields (`./fields`), published-only reads
 * (`./published`), store staff's scope (`./store-staff`), the arguments of a Local API call made
 * for a request (`./as-user`), the locks collection's access (`./locked-documents`), the origins
 * Payload trusts (`./origins`), and the role vocabulary of the `users` collection, re-exported
 * (`owner`, `editor`, `store`).
 */
export { asUser } from './as-user'
export { STAFF_ONLY_ACCESS, staffOnly } from './fields'
export { LOCKED_DOCUMENTS_ACCESS, ownLocks, restrictLockedDocuments } from './locked-documents'
export { siteOrigin, trustedOrigins } from './origins'
export { notForStoreStaff, ownStore } from './store-staff'
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

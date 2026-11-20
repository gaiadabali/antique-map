/**
 * Access helpers every collection uses — `@engine/cms/access`: the shared ones are
 * `@engine/cms-core/access`'s (who may enter the admin and who keeps the catalogue, staff-only
 * fields, published-only reads, the arguments of a Local API call made for a request, the locks
 * collection's access, the origins Payload trusts, and the role vocabulary of the `users`
 * collection: `owner`, `editor`, `store`), re-exported; store staff's scope is this CMS's own
 * (`./store-staff`).
 */
export {
  asUser,
  CATALOGUE_ROLES,
  DEFAULT_ROLE,
  DRAFTED_ACCESS,
  hasRole,
  isCatalogueStaff,
  isOwner,
  isStaff,
  isStaffUser,
  LOCKED_DOCUMENTS_ACCESS,
  ownerOnlyField,
  ownLocks,
  PUBLISHED_ONLY,
  publishedOrStaff,
  restrictLockedDocuments,
  roleOf,
  rolesOnlyField,
  siteOrigin,
  STAFF_ONLY_ACCESS,
  staffOnly,
  staffWithRoles,
  storeOf,
  trustedOrigins,
  USER_ROLES,
  USERS_SLUG,
  type RequestUser,
  type UserRole,
} from '@engine/cms-core/access'
export { notForStoreStaff, ownStore } from '@engine/cms-core/access/store-staff'

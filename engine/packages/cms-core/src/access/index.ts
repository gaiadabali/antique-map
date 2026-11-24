/**
 * Access helpers every CMS uses — `@engine/cms-core/access`: who may enter the admin and who
 * keeps the catalogue (`./roles`), the role vocabulary of the `users` collection and its
 * predicates (`./user-roles`: `owner`, `editor`, `store`), staff-only fields (`./fields`),
 * published-only reads (`./published`), the arguments of a Local API call made for a request
 * (`./as-user`), the locks collection's access (`./locked-documents`), the origins Payload trusts
 * (`./origins`) and who sees which sidebar entry (`./hidden`).
 *
 * A site's own scopes — store staff's store, say — stay with the CMS that has them
 * (`@engine/cms/access`).
 */
export { asUser } from './as-user'
export { STAFF_ONLY_ACCESS, staffOnly } from './fields'
export {
  hiddenFromAllButAllStaff,
  hiddenFromAllButCatalogueStaff,
  hiddenFromAllButOwner,
} from './hidden'
export {
  LOCKED_DOCUMENTS_ACCESS,
  LOCKED_DOCUMENTS_SLUG,
  ownLocks,
  restrictLockedDocuments,
} from './locked-documents'
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
  ROLE_LABELS,
  roleOf,
  rolesOnlyField,
  staffWithRoles,
  storeOf,
  USER_ROLES,
  type SignedIn,
  type UserRole,
} from './user-roles'

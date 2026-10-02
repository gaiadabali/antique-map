/**
 * Public reads see published documents only (ARCHITECTURE.md §12, design decision 14).
 *
 * `publishedOrStaff` is the `read` access of every collection with drafts: the owner and the
 * editors see drafts (the admin, previews); everyone else — an anonymous visitor, a store user, a
 * signed-in account of any other collection — gets a `where` that keeps `_status: 'published'`
 * alone (`./roles` `isCatalogueStaff`). It is the second guard, not the first: loaders and
 * the sister API also pass `overrideAccess: false`, filter `_status` themselves and `select` only
 * what their view model needs, because the Local API's default (`overrideAccess: true`) skips
 * access entirely — about 7,400 migrated drafts would otherwise render and sync.
 *
 * Only for collections with `versions.drafts`: on one without, no document has `_status`, and
 * the filter would hide everything from the public. A drafts collection takes `DRAFTED_ACCESS`
 * whole: Payload's fallback for an unset `readVersions` is any signed-in user, so a signed-in
 * buyer could read every draft through `/versions` (senior-db review of 3.2, S4). The registry
 * refuses a drafts collection or global without both (`registries/collections`).
 */
import type { Access, Where } from 'payload'

import { isCatalogueStaff, isStaff } from './roles'

/** The one filter the public reads under — shared so loaders and tests use the same shape. */
export const PUBLISHED_ONLY: Where = { _status: { equals: 'published' } }

export const publishedOrStaff: Access = ({ req }) =>
  isCatalogueStaff(req.user) ? true : PUBLISHED_ONLY

/** The read side of every collection or global with drafts; spread it into `access`. */
export const DRAFTED_ACCESS = {
  read: publishedOrStaff,
  readVersions: isStaff,
} as const satisfies { read: Access; readVersions: Access }

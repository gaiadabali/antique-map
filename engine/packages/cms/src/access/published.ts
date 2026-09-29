/**
 * Public reads see published documents only (ARCHITECTURE.md §12, design decision 14).
 *
 * `publishedOrStaff` is the `read` access of every collection with drafts: staff see drafts (the
 * admin, previews), everyone else — an anonymous visitor, a signed-in customer — gets a `where`
 * that keeps `_status: 'published'` alone. It is the second guard, not the first: loaders and
 * the sister API also pass `overrideAccess: false`, filter `_status` themselves and `select` only
 * what their view model needs, because the Local API's default (`overrideAccess: true`) skips
 * access entirely — about 7,400 migrated drafts would otherwise render and sync.
 *
 * Only for collections with `versions.drafts`: on one without, no document has `_status`, and
 * the filter would hide everything from the public.
 */
import type { Access, Where } from 'payload'

import { isStaffUser } from './roles'

/** The one filter the public reads under — shared so loaders and tests use the same shape. */
export const PUBLISHED_ONLY: Where = { _status: { equals: 'published' } }

export const publishedOrStaff: Access = ({ req }) => (isStaffUser(req.user) ? true : PUBLISHED_ONLY)

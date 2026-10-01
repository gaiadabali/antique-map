/**
 * Who reaches a `media` record and its file (CONTENT-MODEL.md §6, §8; TASKS.md 8.3.a, 8.3.g).
 *
 * - **The record is public**: a page shows an image's alt text, caption and credit through the
 *   work, product or story that places it, and Payload populates a relation only as far as the
 *   related collection's `read` allows. What the public reads is projected by the loaders
 *   (`select`), and `master` is staff-only at the field.
 * - **The file is not.** `isReadingStaticFile` is Payload's own flag for `/api/media/file/…`: the
 *   upload behind it is the full-resolution processed image, which would bypass the brand's
 *   `publicZoomMaxPx` cap and may carry GPS and camera metadata, so only staff fetch it — the
 *   admin's preview. The public sees derivatives and capped tiles, from the bucket's public
 *   prefixes (`@engine/media/storage`).
 * - **Only staff create images.** A customer's photographs — a consignment's, a return's — are
 *   private, session-bound uploads that never become `media` records (6.2.e's Found 10), so no
 *   customer and no anonymous visitor can make one, by any API.
 */
import type { Access } from 'payload'

import { isStaffUser, staffWithRoles } from '../../access/roles'

/** The record for anyone; the file behind it for staff alone. */
export const readMedia: Access = ({ req, isReadingStaticFile }) =>
  isReadingStaticFile ? isStaffUser(req.user) : true

/** Whoever places images: the catalogue, the editorial side, and a contributor's drafts. */
export const writeMedia: Access = staffWithRoles(
  'admin',
  'manager',
  'cataloguer',
  'editor',
  'contributor',
)

/** Removing an image can empty a published page: the catalogue's owners only. */
export const deleteMedia: Access = staffWithRoles('admin', 'manager', 'cataloguer')

export const MEDIA_ACCESS = {
  read: readMedia,
  create: writeMedia,
  update: writeMedia,
  delete: deleteMedia,
} as const

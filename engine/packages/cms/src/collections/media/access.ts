/**
 * Who reaches a `media` record and its file (CONTENT-MODEL.md §6, §8; TASKS.md 8.3.a, 8.3.g, 3.2.e).
 *
 * - **The record is read by the loaders, never by the public directly.** A page shows an image's
 *   alt text, caption and credit through the work, product or story that places it, read by
 *   `@engine/loaders` on the Local API — published-only and projected — and Payload populates a
 *   relation only as far as the related collection's `read` allows, so the Local API reads it
 *   whoever the visitor. Over REST (and GraphQL, were it on), only staff list or fetch images: a
 *   public list would enumerate every image of every unpublished work, with its file name and
 *   its content address — the secret part of its public derivative keys (C9 `derivativeKey()`).
 *   `master` is staff-only at the field besides.
 * - **Store staff read what they stock and ship** — products, stores, editorial — and none of the
 *   gallery's own: their read is a `Where` on the subject (`subject: not 'work'`), not a menu
 *   trick (TASKS.md 3.2.e, the senior-be review of 2.4, finding 6).
 * - **The file is not.** `isReadingStaticFile` is Payload's own flag for `/api/media/file/…`: the
 *   upload behind it is the full-resolution processed image, which would bypass the public zoom
 *   cap and may carry GPS and camera metadata, so only the owner and the editors fetch it — the
 *   admin's preview (TASKS.md 3.2.e). The public sees derivatives and capped tiles, from the
 *   bucket's public prefixes (`@engine/media/storage`).
 * - **The owner and the editors make and remove images** (CONTENT-MODEL.md §7); no anonymous
 *   visitor can make one, by any API.
 */
import type { Access } from 'payload'

import { isStaffUser } from '../../access/roles'
import { hasRole, staffWithRoles } from '../users/roles'

/** The full-resolution file is the owner's and the editors' alone (3.2.e). */
const fileReaders = staffWithRoles('owner', 'editor')

/**
 * Staff read the record — store staff only what is not of a work; the loaders, on the Local API
 * with no user, read it whoever the visitor is. The file behind it, the owner and the editors.
 */
export const readMedia: Access = (args) => {
  const { req, isReadingStaticFile } = args
  if (isReadingStaticFile) return fileReaders(args)
  if (isStaffUser(req.user)) {
    return hasRole(req.user, 'store') ? { subject: { not_equals: 'work' } } : true
  }
  return req.payloadAPI === 'local'
}

/** Whoever places images: the owner and the editors, who keep the catalogue and the content. */
export const writeMedia: Access = staffWithRoles('owner', 'editor')

/** Removing an image can empty a published page: the same two roles, never store staff. */
export const deleteMedia: Access = staffWithRoles('owner', 'editor')

export const MEDIA_ACCESS = {
  read: readMedia,
  create: writeMedia,
  update: writeMedia,
  delete: deleteMedia,
} as const

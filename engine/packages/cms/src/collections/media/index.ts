/**
 * `media` — the public images (CONTENT-MODEL.md §6; TASKS.md 8.3.a, 8.3.d, 8.3.f, 8.3.g). Each is
 * the image processed from a capture — colour-corrected from the card, straightened, cropped
 * outside the object — that the derivatives and tiles are made from (C9, phase 15). The capture
 * itself is a `masters` record, privately kept.
 *
 * - **Stored in the brand's bucket** through `@payloadcms/storage-s3` (`registries/storage`), under
 *   the private `uploads/` prefix. The bucket serves the public derivatives and capped tiles only;
 *   the upload — full resolution, possibly still carrying GPS and camera metadata — is fetched
 *   through Payload's file route, which `./access` opens to staff alone (8.3.g).
 * - **Limits** (8.3.d): web rasters only — JPEG, PNG, WebP, AVIF, TIFF, sniffed from the bytes by
 *   Payload — and at most `MEDIA_UPLOAD_MAX_BYTES`, under the CDN's limit in front of `/admin`
 *   (`./hooks`). No SVG, which can carry script; no pasted URL, which would have the server fetch
 *   whatever it names.
 * - **No Payload image sizes and no crop**: the derivative ladder is C9's, built by 15.1 from this
 *   file; cropping happened at intake. The focal point stays, for the derivatives' art direction.
 * - **Staff only make images**, a customer never: a consignment's or a return's photographs are
 *   private, session-bound uploads, never `media` records (6.2.e's Found 10).
 */
import { MEDIA_UPLOAD_MIME_TYPES } from '@engine/media/storage'
import type { CollectionConfig } from 'payload'

import { MEDIA_ACCESS } from './access'
import { MEDIA_FIELDS } from './fields'
import {
  altInDefaultLocaleFirst,
  deriveFromFile,
  matchItsMaster,
  refuseOversizedUpload,
} from './hooks'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'role', 'provenance', 'updatedAt'],
    description:
      'Images shown on the site. Each is processed from a capture in Masters; the site shows resized copies of it, never this file itself.',
  },
  access: MEDIA_ACCESS,
  upload: {
    mimeTypes: [...MEDIA_UPLOAD_MIME_TYPES],
    crop: false,
    focalPoint: true,
    pasteURL: false,
  },
  hooks: {
    beforeOperation: [refuseOversizedUpload],
    beforeValidate: [altInDefaultLocaleFirst, matchItsMaster],
    beforeChange: [deriveFromFile],
  },
  fields: MEDIA_FIELDS,
}

/**
 * `media` — the public images (CONTENT-MODEL.md §6; TASKS.md 8.3.a, 8.3.d, 8.3.f, 8.3.g). Each is
 * the image processed from a capture — colour-corrected from the card, straightened, cropped
 * outside the object — that the derivatives and tiles are made from (C9, phase 15). The capture
 * itself is a `masters` record, privately kept.
 *
 * - **Stored in the one media bucket** through `@payloadcms/storage-s3` (`registries/storage`), under
 *   the private `uploads/` prefix. The bucket serves the public derivatives and capped tiles only;
 *   the upload — full resolution, possibly still carrying GPS and camera metadata — is fetched
 *   through Payload's file route, which `./access` opens to staff alone (8.3.g). The record is
 *   staff-only over REST; the storefront's loaders read it on the Local API.
 * - **Limits** (8.3.d): web rasters only — JPEG, PNG, WebP, AVIF, sniffed from the bytes by
 *   Payload — and at most `MEDIA_UPLOAD_MAX_BYTES`, under the CDN's limit in front of `/admin`
 *   (`./hooks`), streamed to the OS temp folder and removed when the request ends — by every
 *   endpoint, for every collection (`hooks/request-temp-files`, TASKS.md 8.3.h). No TIFF, which
 *   is a capture's; no SVG, which can carry script; no pasted URL, which would have the server
 *   fetch whatever it names.
 * - **No Payload image sizes and no crop**: the derivative ladder is C9's, built by 15.1 from this
 *   file; cropping happened at intake. The focal point stays, for the derivatives' art direction.
 * - **Role and provenance are set once**, at intake; only the owner corrects them
 *   (`./frozen`) — provenance decides the synthetic label, which no other writer may take off.
 * - **The owner and the editors make images**; store staff read them (`./access`).
 */
import { MEDIA_UPLOAD_MIME_TYPES } from '@engine/media/storage'
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { MEDIA_ACCESS } from './access'
import { MEDIA_FIELDS } from './fields'
import { freezeAfterCreate, mayCorrectIntake } from './frozen'
import {
  altInDefaultLocaleFirst,
  deriveFromFile,
  matchItsMaster,
  refuseOversizedUpload,
} from './hooks'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Image', id: 'Gambar' },
    plural: { en: 'Images', id: 'Gambar' },
  },
  admin: {
    group: ADMIN_GROUPS.antiques,
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'role', 'provenance', 'updatedAt'],
    description: {
      en: 'Images shown on the site. Each is processed from a capture in Masters; the site shows resized copies of it, never this file itself.',
      id: 'Gambar yang ditampilkan di situs. Masing-masing diolah dari tangkapan di Masters; situs menampilkan salinan berukuran yang diubah, bukan berkas ini sendiri.',
    },
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
    beforeChange: [
      freezeAfterCreate('media', ['role', 'provenance'], mayCorrectIntake),
      deriveFromFile,
    ],
  },
  fields: MEDIA_FIELDS,
}

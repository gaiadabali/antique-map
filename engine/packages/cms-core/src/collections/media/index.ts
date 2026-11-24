/**
 * The `media` collection factory — a CMS's images, and the videos and PDFs its pages play or link
 * (CONTENT-MODEL.md §6; TASKS.md 8.3.a, 8.3.d, 8.3.f, 8.3.g). Each CMS has its own rows and its own
 * bucket (PLAN-V2.md §4.1, Q3). What a record is — image, video or PDF — is its `kind`, derived
 * from the file (`./kinds`); everything below about derivatives, tiles, alt text, role, provenance
 * and subject is an image's alone.
 *
 * - **Stored in the CMS's media bucket** through `@payloadcms/storage-s3` (the CMS's storage
 *   plugin), under the private `uploads/` prefix. The bucket serves the public derivatives and
 *   capped tiles only; the upload — full resolution, possibly still carrying GPS and camera
 *   metadata — is fetched through Payload's file route, which `./access` opens to staff alone
 *   (8.3.g). The record is staff-only over REST; the storefront's loaders read it on the Local API.
 * - **Limits** (8.3.d): web rasters — JPEG, PNG, WebP, AVIF — MP4 and WebM video, and PDF, sniffed
 *   from the bytes by Payload and held to their declared type (`./hooks`), at most
 *   `MEDIA_UPLOAD_MAX_BYTES` (a PDF, `MEDIA_PDF_MAX_BYTES`), under the CDN's limit in front of `/admin`
 *   (`./hooks`), streamed to the OS temp folder and removed when the request ends — by every
 *   endpoint, for every collection (`../../hooks/request-temp-files`, TASKS.md 8.3.h). No TIFF,
 *   which is a capture's; no SVG, which can carry script; no pasted URL, which would have the
 *   server fetch whatever it names. A published video or PDF reaches the public through one route
 *   (`@engine/http/media`), never Payload's file route: only a file a published page places.
 * - **No Payload image sizes and no crop**: the derivative ladder is C9's, built from the file by
 *   the CMS's media pipeline (`afterChange`); cropping happened at intake. The focal point stays,
 *   for the derivatives' art direction.
 * - **Role, provenance and subject are set once**, at intake; only the owner corrects them
 *   (`./frozen`) — provenance decides the synthetic label, which no other writer may take off,
 *   and the subject keeps the gallery's own images out of a store user's read (`./access`).
 * - **The owner and the editors make images**; store staff read them (`./access`).
 */
import { MEDIA_UPLOAD_MIME_TYPES } from '@engine/media/storage'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type {
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Field,
} from 'payload'

import { hiddenFromAllButCatalogueStaff } from '../../access/hidden'
import type { AdminGroup } from '../options'
import { MEDIA_ACCESS } from './access'
import { mediaFields } from './fields'
import { freezeAfterCreate, mayCorrectIntake } from './frozen'
import {
  altInDefaultLocaleFirst,
  deriveFromFile,
  refuseMislabelledUpload,
  refuseOversizedUpload,
} from './hooks'
import { labelFromWords } from './label'

export { deleteMedia, MEDIA_ACCESS, readMedia, writeMedia } from './access'
export { altBaseline, withoutLabel, type AltBaselineInput } from './alt-baseline'
export {
  ALT_MAX_LENGTH,
  ALT_SOURCES,
  DERIVATIVE_STATES,
  DERIVED_FIELDS,
  MEDIA_SUBJECTS,
  mediaFields,
  requiredOfAnImage,
  SUBJECT_OPTIONS,
  TILE_STATES,
  TRANSLATION_STATES,
  validateAlt,
  type MediaSubject,
} from './fields'
export { changedFields, freezeAfterCreate, mayCorrectIntake } from './frozen'
export { LABEL_FIELD, labelFromWords, labelOf } from './label'
export {
  altInDefaultLocaleFirst,
  deriveFromFile,
  refuseMislabelledUpload,
  refuseOversizedUpload,
} from './hooks'
export {
  forImagesOnly,
  IMAGES_ONLY,
  KIND_LABELS,
  kindOfData,
  PDFS_ONLY,
  showForFile,
  showForImage,
  validateFileDescription,
  validateFileTitle,
  VIDEOS_ONLY,
} from './kinds'
export {
  optionsOf,
  PROVENANCE_LABELS,
  PROVENANCE_OPTIONS,
  RETOUCHING_LABELS,
  RETOUCHING_OPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  TIER_LABELS,
  TIER_OPTIONS,
  VERDICT_LABELS,
  VERDICT_OPTIONS,
  type Option,
} from './options'

export type MediaOptions = {
  /** The admin sidebar group (the CMS's own labels). */
  readonly group: AdminGroup
  /** The CMS's own intake fields, after `provenance` — the gallery's `master`. */
  readonly intakeFields?: readonly Field[]
  /** Run after the default-locale rule — the gallery's "an image is its master's". */
  readonly beforeValidate?: readonly CollectionBeforeValidateHook[]
  /** After the response — the CMS's derivative pipeline, which knows what shows each image. */
  readonly afterChange?: readonly CollectionAfterChangeHook[]
}

export function mediaCollection(options: MediaOptions): CollectionConfig & { slug: 'media' } {
  return {
    slug: 'media',
    labels: {
      singular: { en: 'Media file', id: 'Berkas media' },
      plural: { en: 'Media', id: 'Media' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButCatalogueStaff,
      // Every kind's own words (`./label`): alt text, a video's or PDF's title, else the file name.
      useAsTitle: 'label',
      defaultColumns: ['filename', 'kind', 'alt', 'title', 'updatedAt'],
      listSearchableFields: ['filename', 'alt', 'title'],
      description: {
        en: 'Images, videos (MP4, WebM) and PDFs for the site. The site shows resized copies of an image, never the file itself; a video or a PDF is shown only once a published page places it. A PDF may be at most 20 MB.',
        id: 'Gambar, video (MP4, WebM), dan PDF untuk situs. Situs menampilkan salinan gambar yang diubah ukurannya, bukan berkasnya sendiri; video atau PDF baru tampil setelah halaman yang terbit memuatnya. PDF paling besar 20 MB.',
      },
    },
    access: MEDIA_ACCESS,
    upload: {
      // Without S3 (the tests), Payload writes files to <cwd>/media — the repo root under vitest,
      // where one run's files made the next run's names collide (`-1`) and were once committed.
      // Under vitest each process writes to a folder of its own in the system temp dir instead.
      ...(process.env.VITEST
        ? { staticDir: join(tmpdir(), 'indies-test-media', String(process.pid)) }
        : {}),
      mimeTypes: [...MEDIA_UPLOAD_MIME_TYPES],
      crop: false,
      focalPoint: true,
      pasteURL: false,
    },
    hooks: {
      beforeOperation: [refuseOversizedUpload, refuseMislabelledUpload],
      beforeValidate: [altInDefaultLocaleFirst, ...(options.beforeValidate ?? [])],
      beforeChange: [
        freezeAfterCreate('media', ['role', 'provenance', 'subject'], mayCorrectIntake),
        deriveFromFile,
        labelFromWords,
      ],
      afterChange: [...(options.afterChange ?? [])],
    },
    fields: mediaFields(options.intakeFields),
  }
}

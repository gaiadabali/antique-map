/**
 * `masters` — one record per private file: a capture as received, or a design's print file
 * (CONTENT-MODEL.md §6; ARCHITECTURE.md §7; TASKS.md 8.3.b, 8.3.f).
 *
 * **A plain collection, not an upload collection.** Its files never pass through the app server:
 * a large TIFF would exceed the CDN's request limit in front of `/admin`, and Payload would hold it
 * in memory. The upload is two steps — `POST /api/masters/upload-url` signs a PUT for one key,
 * length and SHA-256 (`./upload-url`), the client sends the bytes straight to the private masters
 * bucket, and creating the record completes it, once the bucket confirms it holds that file
 * (`./hooks`). With no `upload` in its config, Payload never parses a file sent to it, and the
 * storage plugin never touches it (`registries/storage`).
 *
 * **No public URL.** The record has no `url` field; the bucket allows no anonymous read; staff
 * alone read the record (`./access`). Presigned reads, with an access log, are TASKS.md 15.4's.
 *
 * An intake batch's manifest becomes records through `./intake-import`, idempotently by checksum.
 */
import type { CollectionConfig } from 'payload'

import { MASTERS_ACCESS } from './access'
import { MASTER_FIELDS } from './fields'
import { checkConsistency, fillFromKey, keepWhatIsFixed, verifyInBucket } from './hooks'
import { uploadUrlEndpoint } from './upload-url'

export const Masters: CollectionConfig = {
  slug: 'masters',
  labels: { singular: 'Master', plural: 'Masters' },
  admin: {
    useAsTitle: 'storageKey',
    defaultColumns: ['storageKey', 'kind', 'role', 'brand', 'updatedAt'],
    description:
      'The private files images and print files are made from: every capture as received, and each design’s print file. Never shown on the site.',
  },
  access: MASTERS_ACCESS,
  endpoints: [uploadUrlEndpoint()],
  hooks: {
    beforeValidate: [fillFromKey, checkConsistency],
    beforeChange: [keepWhatIsFixed, verifyInBucket()],
  },
  fields: MASTER_FIELDS,
}

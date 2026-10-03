/**
 * `masters` — one record per private file: a capture as received (CONTENT-MODEL.md §5; ARCHITECTURE.md §7; TASKS.md 8.3.b, 8.3.f).
 *
 * **A plain collection, not an upload collection.** Its files never pass through the app server:
 * a large TIFF would exceed the CDN's request limit in front of `/admin`, and Payload would hold it
 * in memory. The upload is two steps — `POST /api/masters/upload-url` signs a PUT for one key,
 * length and SHA-256 (`./upload-url`), the client sends the bytes straight to the private masters
 * bucket, and creating the record completes it, once the bucket confirms it holds that file
 * (`./hooks`). With no `upload` in its config, Payload stores no file sent to it and the storage
 * plugin never touches it (`registries/storage`); Payload still parses a multipart body to disk
 * before access is checked, so the collection drops the file at once (`dropSentFile`) and the
 * request's clean-up removes its temporary copy (`hooks/request-temp-files`, TASKS.md 8.3.h).
 *
 * **No public URL.** The record has no `url` field; the bucket allows no anonymous read; the owner
 * and the editors alone read the record (`./access`). Presigned reads, with an access log, are TASKS.md 15.4's.
 *
 * **One masters bucket** serves both sites (TASKS.md 2.4.b): no brand on the record or in its key,
 * and no outlet whose key writes print files only. Kind and checksum never change; role and
 * provenance, set at intake, only by the owner (`../media/frozen`).
 *
 * An intake batch's manifest becomes records through `./intake-import`, idempotently by checksum.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { freezeAfterCreate, mayCorrectIntake } from '../media/frozen'
import { MASTERS_ACCESS } from './access'
import { MASTER_FIELDS } from './fields'
import {
  checkConsistency,
  dropSentFile,
  fillFromKey,
  keepWhatIsFixed,
  verifyInBucket,
} from './hooks'
import { uploadUrlEndpoint } from './upload-url'

export const Masters: CollectionConfig = {
  slug: 'masters',
  labels: {
    singular: { en: 'Master', id: 'Master' },
    plural: { en: 'Masters', id: 'Master' },
  },
  admin: {
    group: ADMIN_GROUPS.antiques,
    useAsTitle: 'storageKey',
    defaultColumns: ['storageKey', 'kind', 'role', 'work', 'updatedAt'],
    description: {
      en: 'The private files images are made from: every capture as received. Never shown on the site.',
      id: 'Berkas pribadi tempat gambar dibuat: setiap tangkapan sebagaimana diterima. Tidak pernah ditampilkan di situs.',
    },
  },
  access: MASTERS_ACCESS,
  endpoints: [uploadUrlEndpoint()],
  hooks: {
    beforeOperation: [dropSentFile],
    beforeValidate: [fillFromKey, checkConsistency],
    beforeChange: [
      keepWhatIsFixed,
      freezeAfterCreate('masters', ['role', 'provenance'], mayCorrectIntake),
      verifyInBucket(),
    ],
  },
  fields: MASTER_FIELDS,
}

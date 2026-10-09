/**
 * `works` — the objects themselves (TASKS.md 8.2; CONTENT-MODEL.md §1, §9; requirements 3.1–3.3,
 * 3.7–3.11). **A work is the object; a product is how it is sold**: the 1726 Valentijn map of Bali
 * is a work, the original on offer one product of it, a giclée print another (9.1). No price is
 * ever on a work.
 *
 * - **Fields** (`./fields-record`, `./fields-object`, `./fields-staff`): the record as catalogued —
 *   `publicId` (the old site's number, from 100000, kept for ever — 3.2.b), `status` and
 *   `location` (3.2.d) — its place in the discovery vocabulary, the object — condition, images,
 *   master — and what the public never reads: `askingPrice` (whole US dollars, the owner's
 *   alone — Q14), `physical` (no defaults; staff-only, by role), rights, cataloguing, legacy ids,
 *   SEO. The essay, `description`, is a run of C4 blocks and lands with them (as `makers.bio`
 *   does — `../makers` says why there is no placeholder; 8.2's report).
 * - **Every save** (drafts included, `drafts.validate`): dates in order and with their precision,
 *   sizes positive and the image on its sheet, credits and places without duplicates, images a work
 *   may show, a recto's master, the uid made once and kept.
 * - **Publishing** (`hooks/work-guard`): title, object type, date, a primary place or a maker, the
 *   primary image with its alt, a grade for an original, no unchecked AI draft — every missing one
 *   at once. A blank location or export status never blocks it: the item is enquiry-only.
 * - **Access** (`./access`): `publishedOrStaff`; owner and editors write; `physical` by role.
 * - **AI drafting** (`ai/`, TASKS.md 8.3): the sidebar's "Draft from photographs" button; who
 *   verified each drafted field is stamped by the server (`ai/audit`), never sent.
 * - **After the commit** (`hooks/work-invalidate`): the work's cache tags expire.
 * - **Deletes** of the makers, places and terms a work references are refused while it does
 *   (`hooks/work-references`), and every work save holds the lock those deletes take. A work's
 *   sources are plain-text `references` rows now (3.2.a) — no collection to delete.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { stampAiDraft } from '../../ai/audit'
import { draftFromPhotosField } from '../../ai/fields'
import { hiddenFromAllButCatalogueStaff } from '../../admin/hidden'
import { stampCataloguing } from '../../hooks/work-cataloguing'
import { guardWork } from '../../hooks/work-guard'
import { invalidateWorkOnChange, invalidateWorkOnDelete } from '../../hooks/work-invalidate'
import { holdWorkReferences } from '../../hooks/work-references'
import { assignWorkUid } from '../../hooks/work-uid'
import { WORKS_ACCESS, WORKS_VERSIONS } from './access'
import { OBJECT_FIELDS } from './fields-object'
import { RECORD_FIELDS } from './fields-record'
import { STAFF_FIELDS } from './fields-staff'
import { assignPublicId } from './public-id'

export const Works: CollectionConfig = {
  slug: 'works',
  labels: {
    singular: { en: 'Antique', id: 'Antik' },
    plural: { en: 'Antiques', id: 'Antik' },
  },
  admin: {
    group: ADMIN_GROUPS.antiques,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'title',
    defaultColumns: ['title', 'stockNumber', 'objectType', 'status', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'stockNumber', 'workUid', 'publicId', 'originalTitle'],
    description: {
      en: 'Shown on Indies Gallery only — never priced, never in a cart. The objects themselves: each map, print, photograph or book.',
      id: 'Hanya tampil di Indies Gallery — tanpa harga, tanpa keranjang. Objeknya sendiri: setiap peta, cetakan, foto, atau buku.',
    },
  },
  access: WORKS_ACCESS,
  versions: WORKS_VERSIONS,
  hooks: {
    beforeChange: [
      holdWorkReferences,
      assignWorkUid,
      assignPublicId,
      stampAiDraft,
      stampCataloguing,
      guardWork,
    ],
    afterChange: [invalidateWorkOnChange],
    afterDelete: [invalidateWorkOnDelete],
  },
  fields: [draftFromPhotosField, ...RECORD_FIELDS, ...OBJECT_FIELDS, ...STAFF_FIELDS],
}

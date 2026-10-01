/**
 * `works` — the objects themselves (TASKS.md 8.2; CONTENT-MODEL.md §1, §9; requirements 3.1–3.3,
 * 3.7–3.11). **A work is the object; a product is how it is sold**: the 1726 Valentijn map of Bali
 * is a work, the original on offer one product of it, a giclée print another (9.1). No price is
 * ever on a work.
 *
 * - **Fields** (`./fields-record`, `./fields-object`, `./fields-staff`): the record as catalogued,
 *   its place in the discovery vocabulary, the object — condition, images, master — and what the
 *   public never reads: `physical` (no defaults; staff-only, by role), rights, origin, cataloguing,
 *   legacy ids, SEO. The essay, `description`, is a run of C4 blocks and lands with them (as
 *   `makers.bio` does — `../makers` says why there is no placeholder; 8.2's report).
 * - **Every save** (drafts included, `drafts.validate`): dates in order and with their precision,
 *   sizes positive and the image on its sheet, credits and places without duplicates, images a work
 *   may show, a recto's master, a copy's synced fields unchanged, the uid made once and kept.
 * - **Publishing** (`hooks/work-guard`): title, object type, date, a primary place or a maker, the
 *   primary image with its alt, a grade for an original, no unchecked AI draft — every missing one
 *   at once. A blank location or export status never blocks it: the item is enquiry-only.
 * - **Access** (`./access`): `publishedOrStaff`; `physical` by role; contributors save drafts.
 * - **After the commit** (`hooks/work-invalidate`): the work's cache tags expire.
 * - **Deletes** of the makers, places, terms and sources a work references are refused while it
 *   does (`hooks/work-references`), and every work save holds the lock those deletes take.
 */
import type { CollectionConfig } from 'payload'

import { stampCataloguing } from '../../hooks/work-cataloguing'
import { guardWork } from '../../hooks/work-guard'
import { invalidateWorkOnChange, invalidateWorkOnDelete } from '../../hooks/work-invalidate'
import { holdWorkReferences } from '../../hooks/work-references'
import { keepSyncedFields } from '../../hooks/work-synced'
import { assignWorkUid } from '../../hooks/work-uid'
import { refuseContributorPublish, WORKS_ACCESS, WORKS_VERSIONS } from './access'
import { OBJECT_FIELDS } from './fields-object'
import { RECORD_FIELDS } from './fields-record'
import { STAFF_FIELDS } from './fields-staff'

export { SISTER_SYNC_CONTEXT } from '../../hooks/work-synced'

export const Works: CollectionConfig = {
  slug: 'works',
  labels: { singular: 'Work', plural: 'Works' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'stockNumber', 'objectType', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'stockNumber', 'workUid', 'originalTitle'],
    description:
      'The objects themselves — each map, print, photograph or book. How one is sold is its product.',
  },
  access: WORKS_ACCESS,
  versions: WORKS_VERSIONS,
  hooks: {
    beforeChange: [
      refuseContributorPublish,
      holdWorkReferences,
      assignWorkUid,
      keepSyncedFields,
      stampCataloguing,
      guardWork,
    ],
    afterChange: [invalidateWorkOnChange],
    afterDelete: [invalidateWorkOnDelete],
  },
  fields: [...RECORD_FIELDS, ...OBJECT_FIELDS, ...STAFF_FIELDS],
}

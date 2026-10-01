/**
 * `sources` — the bibliography (TASKS.md 8.1.c; CONTENT-MODEL.md §3): Tooley, Koeman, Parry,
 * Schilder, Suárez, Tibbetts. Each reference on a work (`references { source, ref, note }`, 8.2)
 * links to its source page (`/sources/tooley`, EXPERIENCE-GALLERY.md §7) — the seed of the Parry
 * cartobibliography.
 *
 * - `shortCite` is how references cite it; the slug is made from it once.
 * - `citation` is the full bibliographic entry; publishing a source needs one.
 * - Nothing here is translated — a citation is quoted as published — so the collection has no
 *   localised field and no translation status.
 * - Drafts, the slug, access and versions are the vocabulary's own (`../terms/vocabulary`).
 */
import type { CollectionConfig, Validate } from 'payload'

import {
  shortCiteError,
  SHORT_CITE_MAX_LENGTH,
  sourceYearError,
} from '../../validators/source-citation'
import {
  refuseContributorPublish,
  VOCABULARY_ACCESS,
  VOCABULARY_VERSIONS,
} from '../terms/vocabulary/access'
import { requiredToPublish, webUrl } from '../terms/vocabulary/fields'
import { slugField } from '../terms/vocabulary/slug'

const validateShortCite: Validate = (value) =>
  shortCiteError(typeof value === 'string' ? value : null) ?? true

const validateYear: Validate = (value) =>
  sourceYearError(typeof value === 'number' ? value : value == null ? null : Number.NaN) ?? true

export const Sources: CollectionConfig = {
  slug: 'sources',
  labels: { singular: 'Source', plural: 'Sources' },
  admin: {
    useAsTitle: 'shortCite',
    defaultColumns: ['shortCite', 'year', '_status', 'updatedAt'],
    listSearchableFields: ['shortCite', 'citation', 'slug'],
  },
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: { beforeChange: [refuseContributorPublish] },
  fields: [
    {
      name: 'shortCite',
      type: 'text',
      required: true,
      index: true,
      maxLength: SHORT_CITE_MAX_LENGTH,
      validate: validateShortCite,
      admin: { description: 'How references cite it: "Tooley", "Koeman", "Tooley (Australia)".' },
    },
    slugField({ from: 'shortCite' }),
    {
      name: 'citation',
      type: 'textarea',
      maxLength: 2000,
      validate: requiredToPublish('A published source gives its full citation.'),
      admin: { description: 'The full entry: author, title, place, publisher, year.' },
    },
    {
      name: 'year',
      type: 'number',
      validate: validateYear,
      admin: {
        step: 1,
        description: 'The year it was published (the first, for a multi-volume work).',
      },
    },
    {
      name: 'url',
      type: 'text',
      maxLength: 2048,
      validate: webUrl(),
      admin: { description: 'Where it can be read or bought online, if anywhere.' },
    },
  ],
}

/**
 * `makers` — the people and studios who made the works (TASKS.md 8.1.a; CONTENT-MODEL.md §3):
 * "BLAEU, Willem Janszoon", Valentijn, Woodbury & Page. A maker page per maker is raremaps'
 * strongest SEO asset (EXPERIENCE-GALLERY.md §7: bio, life dates, portrait, what they made, what
 * is available, what has sold); a work credits makers with a role and a certainty (8.2).
 *
 * - `name` as the maker is known, `sortName` as a collector's maker line reads (C2
 *   `MakerCreditVM.sortName`), `aliases` the other spellings search expands to (16.2).
 * - Life dates with precision (`./life-dates`), never implied certain.
 * - `bio` is not here yet. It is a run of C4 blocks (CONTENT-MODEL.md §7) — never an open rich-text
 *   field — and the block definitions arrive with TASKS.md 9.3.a. A `blocks` field with no blocks
 *   is no placeholder: Payload 3.90's admin drops an empty block list from the client config and
 *   then maps over it, so the whole edit view renders blank. It lands, additively, with the blocks.
 * - `sameAs`: Wikidata, ULAN — the maker page's JSON-LD `sameAs`.
 * - Drafts, the slug, access and versions are the vocabulary's own (`../terms/vocabulary`).
 */
import type { CollectionConfig, Validate } from 'payload'

import { aliasErrors, sameAsErrors } from '../../validators/maker-names'
import {
  refuseContributorPublish,
  VOCABULARY_ACCESS,
  VOCABULARY_VERSIONS,
} from '../terms/vocabulary/access'
import { isBlank, translationStatusField, webUrl } from '../terms/vocabulary/fields'
import { slugField } from '../terms/vocabulary/slug'
import { lifeDateGroup } from './life-dates'
import { MAKER_ROLE_LABELS, MAKER_ROLES } from './roles'

/** The row index of an array field's sub-field, from the path Payload validates it under. */
const rowOf = (path: readonly (number | string)[]) => Number(path[path.length - 2])

type MakerData = { name?: string; aliases?: { name?: string }[]; sameAs?: { url?: string }[] }

const validateAlias: Validate = (_value, { data, path }) => {
  const record = data as MakerData | undefined
  const errors = aliasErrors(
    (record?.aliases ?? []).map((row) => row?.name),
    record?.name,
  )
  return errors[rowOf(path)] ?? true
}

const validateSameAs: Validate = async (value, options) => {
  if (isBlank(value)) return 'Give the web address of the record, or remove the row.'
  const shape = await webUrl({ httpsOnly: true })(value, options)
  if (shape !== true) return shape
  const record = options.data as MakerData | undefined
  const errors = sameAsErrors((record?.sameAs ?? []).map((row) => row?.url))
  return errors[rowOf(options.path)] ?? true
}

const required =
  (message: string): Validate =>
  (value) =>
    isBlank(value) ? message : true

export const Makers: CollectionConfig = {
  slug: 'makers',
  labels: { singular: 'Maker', plural: 'Makers' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sortName', 'roles', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'sortName', 'aliases.name'],
  },
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: { beforeChange: [refuseContributorPublish] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
      validate: required('Give the name the maker is known by, such as "François Valentijn".'),
      admin: { description: 'As the maker is known: "François Valentijn", "Woodbury & Page".' },
    },
    {
      name: 'sortName',
      type: 'text',
      required: true,
      index: true,
      maxLength: 200,
      validate: required('Give the name as a maker line sorts it, such as "VALENTIJN, François".'),
      admin: {
        description: 'As a collector’s maker line reads, surname first: "BLAEU, Willem Janszoon".',
      },
    },
    slugField({ from: 'name' }),
    {
      name: 'aliases',
      type: 'array',
      labels: { singular: 'Other spelling', plural: 'Other spellings' },
      admin: { description: 'Valentyn beside Valentijn: the spellings a search should also find.' },
      fields: [{ name: 'name', type: 'text', required: true, validate: validateAlias }],
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: MAKER_ROLES.map((value) => ({ value, label: MAKER_ROLE_LABELS[value] })),
      admin: { description: 'What the maker is known for. A work names the role on that work.' },
    },
    {
      type: 'row',
      fields: [lifeDateGroup('born', 'Born'), lifeDateGroup('died', 'Died')],
    },
    {
      name: 'nationality',
      type: 'text',
      localized: true,
      maxLength: 120,
      admin: { description: '"Dutch", "Belanda" — in each language.' },
    },
    {
      name: 'portrait',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'A portrait, if one exists.' },
    },
    {
      name: 'sameAs',
      type: 'array',
      maxRows: 10,
      labels: { singular: 'Authority record', plural: 'Authority records' },
      admin: { description: 'The same maker elsewhere: Wikidata, the Getty ULAN.' },
      fields: [{ name: 'url', type: 'text', required: true, validate: validateSameAs }],
    },
    translationStatusField,
  ],
}

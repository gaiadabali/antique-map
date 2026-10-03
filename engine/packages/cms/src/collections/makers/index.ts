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
 * - The slug and translation status are the shared `fields/`; drafts, access and versions the
 *   vocabulary's own (`../terms/vocabulary/access`).
 */
import type { CollectionConfig, Validate } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { aliasErrors, sameAsErrors } from '../../validators/maker-names'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from '../terms/vocabulary/access'
import { slugField } from '../../fields/slug'
import { translationStatusField } from '../../fields/translation-status'
import { isBlank, webUrl } from '../../fields/validate'
import { lifeDateGroup } from './life-dates'
import { MAKER_ROLE_LABELS, MAKER_ROLES } from './roles'
import { refuseDeleteWhileUsed } from './still-used'

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
  labels: {
    singular: { en: 'Maker', id: 'Pembuat' },
    plural: { en: 'Makers', id: 'Pembuat' },
  },
  admin: {
    group: ADMIN_GROUPS.antiques,
    useAsTitle: 'name',
    defaultColumns: ['name', 'sortName', 'roles', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'sortName', 'aliases.name'],
  },
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: { beforeDelete: [refuseDeleteWhileUsed] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
      validate: required({
        en: 'Give the name the maker is known by, such as "François Valentijn".',
        id: 'Berikan nama yang dikenal pembuatnya, seperti "François Valentijn".',
      }),
      admin: {
        description: {
          en: 'As the maker is known: "François Valentijn", "Woodbury & Page".',
          id: 'Seperti pembuat dikenal: "François Valentijn", "Woodbury & Page".',
        },
      },
    },
    {
      name: 'sortName',
      type: 'text',
      required: true,
      index: true,
      maxLength: 200,
      validate: required({
        en: 'Give the name as a maker line sorts it, such as "VALENTIJN, François".',
        id: 'Berikan nama seperti diurutkan dalam baris pembuat, seperti "VALENTIJN, François".',
      }),
      admin: {
        description: {
          en: 'As a collector’s maker line reads, surname first: "BLAEU, Willem Janszoon".',
          id: 'Seperti baris pembuat kolektor dibaca, marga dulu: "BLAEU, Willem Janszoon".',
        },
      },
    },
    slugField({ from: 'name' }),
    {
      name: 'aliases',
      type: 'array',
      labels: {
        singular: { en: 'Other spelling', id: 'Ejaan lain' },
        plural: { en: 'Other spellings', id: 'Ejaan lain' },
      },
      admin: {
        description: {
          en: 'Valentyn beside Valentijn: the spellings a search should also find.',
          id: 'Valentyn di samping Valentijn: ejaan yang juga harus ditemukan pencarian.',
        },
      },
      fields: [{ name: 'name', type: 'text', required: true, validate: validateAlias }],
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: MAKER_ROLES.map((value) => ({ value, label: MAKER_ROLE_LABELS[value] })),
      admin: {
        description: {
          en: 'What the maker is known for. A work names the role on that work.',
          id: 'Apa yang dikenal dari pembuat. Karya menyebutkan peran pada karya itu.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        lifeDateGroup('born', { en: 'Born', id: 'Lahir' }),
        lifeDateGroup('died', { en: 'Died', id: 'Wafat' }),
      ],
    },
    {
      name: 'nationality',
      type: 'text',
      localized: true,
      maxLength: 120,
      admin: {
        description: {
          en: '"Dutch", "Belanda" — in each language.',
          id: '"Dutch", "Belanda" — dalam setiap bahasa.',
        },
      },
    },
    {
      name: 'portrait',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          en: 'A portrait, if one exists.',
          id: 'Potret, jika ada.',
        },
      },
    },
    {
      name: 'sameAs',
      type: 'array',
      maxRows: 10,
      labels: {
        singular: { en: 'Authority record', id: 'Catatan otoritas' },
        plural: { en: 'Authority records', id: 'Catatan otoritas' },
      },
      admin: {
        description: {
          en: 'The same maker elsewhere: Wikidata, the Getty ULAN.',
          id: 'Pembuat yang sama di tempat lain: Wikidata, Getty ULAN.',
        },
      },
      fields: [{ name: 'url', type: 'text', required: true, validate: validateSameAs }],
    },
    translationStatusField,
  ],
}

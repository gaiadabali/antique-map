/**
 * `terms` — the editable vocabularies (TASKS.md 8.1.c; CONTENT-MODEL.md §3): a work's subjects
 * (Wayang, Batik, Temples, Spices, VOC, Costume), the shop's moods, rooms, occasions and
 * recipients, and the gallery's published condition scale — the grades a work's
 * `condition.grade` points at (8.2.a; the gallery's VG+ · VG · G+ · G · Fair · As-is, D10).
 *
 * - `kind` says which vocabulary a term belongs to and never changes after it is created: works
 *   point at a grade as a grade.
 * - `label` is localised; `slug` is made from it once and is unique within its kind — it is the
 *   value the term's facet carries in a URL.
 * - A grade carries its `definition` and its A–D `equivalent`; publishing a grade needs both.
 * - `position` orders a vocabulary where order means something: a grade scale, best first.
 */
import type { CollectionConfig, Validate } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { gradeEquivalentError } from '../../validators/term-grade'
import { TERM_KIND_LABELS, TERM_KINDS } from './kinds'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from './vocabulary/access'
import { slugField } from '../../fields/slug'
import { translationStatusField } from '../../fields/translation-status'
import {
  IN_DEFAULT_LOCALE_NOTE,
  requiredInDefaultLocale,
  requiredToPublish,
} from '../../fields/validate'
import { refuseDeleteWhileUsed } from './still-used'

const isGrade = (data: unknown) => (data as { kind?: unknown } | undefined)?.kind === 'grade'

const validateKind: Validate = (value, { operation, previousValue }) => {
  if (value === null || value === undefined || value === '')
    return 'Choose which vocabulary the term belongs to.'
  if (!(TERM_KINDS as readonly unknown[]).includes(value))
    return 'Choose one of the listed vocabularies.'
  if (operation === 'update' && previousValue && previousValue !== value) {
    return 'A term keeps its vocabulary: create a new term in the other one instead.'
  }
  return true
}

const validateEquivalent: Validate = async (value, options) => {
  const shape = gradeEquivalentError(typeof value === 'string' ? value : null)
  if (shape) return shape
  return requiredToPublish('A published grade gives its A–D equivalent.')(value, options)
}

const validatePosition: Validate = (value) =>
  value === null || value === undefined || (Number.isInteger(value) && Number(value) >= 0)
    ? true
    : 'A position is a whole number, 0 or more.'

export const Terms: CollectionConfig = {
  slug: 'terms',
  labels: {
    singular: { en: 'Term', id: 'Istilah' },
    plural: { en: 'Terms', id: 'Istilah' },
  },
  admin: {
    group: ADMIN_GROUPS.antiques,
    useAsTitle: 'label',
    defaultColumns: ['label', 'kind', 'position', '_status', 'updatedAt'],
    listSearchableFields: ['label', 'slug'],
  },
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: { beforeDelete: [refuseDeleteWhileUsed] },
  // A slug is unique within its vocabulary: "warm" may be a mood and a room's colour both.
  indexes: [{ fields: ['kind', 'slug'], unique: true }],
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      options: TERM_KINDS.map((value) => ({ value, label: TERM_KIND_LABELS[value] })),
      validate: validateKind,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Fixed once the term is created.',
          id: 'Tetap setelah istilah dibuat.',
        },
      },
    },
    {
      name: 'label',
      type: 'text',
      localized: true,
      maxLength: 120,
      validate: requiredInDefaultLocale('Give the term’s name, such as "Batik" or "VG+".'),
      admin: {
        description: {
          en: `As a visitor reads it: "Batik", "VG+". ${(IN_DEFAULT_LOCALE_NOTE as { en: string }).en}`,
          id: 'Seperti pengunjung membacanya: "Batik", "VG+". Wajib dalam bahasa Inggris, bahasa default; bahasa lain yang kosong akan menunjukkan bahasa Inggris.',
        },
      },
    },
    slugField({ from: 'label', scope: 'kind' }),
    {
      name: 'definition',
      type: 'textarea',
      localized: true,
      maxLength: 600,
      validate: requiredToPublish('A published grade says what it means, in a sentence or two.'),
      admin: {
        condition: isGrade,
        description: {
          en: 'What the grade means, as the condition legend shows it.',
          id: 'Apa arti tingkat ini, seperti ditunjukkan legenda kondisi.',
        },
      },
    },
    {
      name: 'equivalent',
      type: 'text',
      maxLength: 7,
      validate: validateEquivalent,
      admin: {
        condition: isGrade,
        description: {
          en: 'Its A–D equivalent: A, B+, C or B/C.',
          id: 'Setara A–D-nya: A, B+, C, atau B/C.',
        },
      },
    },
    {
      name: 'position',
      type: 'number',
      index: true,
      validate: validatePosition,
      admin: {
        step: 1,
        description: {
          en: 'Order within its vocabulary: a grade scale best first.',
          id: 'Urutan dalam kosakatanya: skala kondisi terbaik dulu.',
        },
      },
    },
    translationStatusField,
  ],
}

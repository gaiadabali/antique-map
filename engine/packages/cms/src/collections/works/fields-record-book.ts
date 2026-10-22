/**
 * A volume's collation, split out of `./fields-record` to keep each file under 300 lines: shows
 * for books and atlases only (`BOUND_OBJECT_TYPES`).
 */
import type { Field } from 'payload'

import { RECORD_NOTES } from './record-copy'
import { BOUND_OBJECT_TYPES } from './vocabulary'

const described = (note: { en: string; id: string }) => ({ description: note })

const isBound = (data: unknown) =>
  (BOUND_OBJECT_TYPES as readonly unknown[]).includes(
    (data as { objectType?: unknown })?.objectType,
  )

export const bookField: Field = {
  name: 'book',
  type: 'group',
  label: { en: 'Book or atlas', id: 'Buku atau atlas' },
  admin: { condition: isBound, ...described(RECORD_NOTES.book) },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'binding',
          type: 'text',
          label: { en: 'Binding', id: 'Penjilidan' },
          localized: true,
          maxLength: 300,
        },
        {
          name: 'pagination',
          type: 'text',
          label: { en: 'Pagination', id: 'Penomoran halaman' },
          maxLength: 300,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'plates', type: 'text', label: { en: 'Plates', id: 'Pelat' }, maxLength: 300 },
        {
          name: 'completeness',
          type: 'text',
          label: { en: 'Completeness', id: 'Kelengkapan' },
          localized: true,
          maxLength: 300,
        },
      ],
    },
    {
      name: 'openings',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Openings', id: 'Bukaan' },
      hasMany: true,
      admin: described(RECORD_NOTES.bookOpenings),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'spine',
          type: 'upload',
          relationTo: 'media',
          label: { en: 'Spine', id: 'Punggung buku' },
        },
        {
          name: 'cover',
          type: 'upload',
          relationTo: 'media',
          label: { en: 'Cover', id: 'Sampul' },
        },
      ],
    },
  ],
}

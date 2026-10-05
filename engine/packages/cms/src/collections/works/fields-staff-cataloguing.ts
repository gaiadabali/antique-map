/**
 * The rest of a work's staff-only record, split out of `./fields-staff` to keep each file under
 * 300 lines: the cataloguing workflow, the migration's legacy ids, and the SEO overrides.
 */
import type { Field } from 'payload'

import { translationStatusField } from '../../fields/translation-status'
import { STAFF_ONLY_ACCESS } from '../../access/fields'
import { AI_DRAFTABLE_FIELDS, AI_DRAFTABLE_LABELS, CATALOGUING_STATUS_OPTIONS } from './vocabulary'

/** A duplicate is another object: its workflow and legacy ids start empty. */
const cleared = () => ({})

export const CATALOGUING_FIELDS: Field[] = [
  {
    name: 'cataloguing',
    type: 'group',
    label: { en: 'Cataloguing', id: 'Pengatalogan' },
    access: STAFF_ONLY_ACCESS,
    hooks: { beforeDuplicate: [cleared] },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'status',
            type: 'select',
            label: { en: 'Status', id: 'Status' },
            defaultValue: 'draft',
            options: CATALOGUING_STATUS_OPTIONS,
          },
          {
            name: 'cataloguer',
            type: 'relationship',
            relationTo: 'users',
            label: { en: 'Cataloguer', id: 'Pengatalog' },
          },
          {
            name: 'verifiedAt',
            type: 'date',
            label: { en: 'Verified', id: 'Diverifikasi' },
            admin: { readOnly: true },
          },
        ],
      },
      {
        name: 'aiDraft',
        type: 'group',
        label: { en: 'Drafted by AI, not yet checked', id: 'Dibuat draf oleh AI, belum diperiksa' },
        admin: {
          description: {
            en: 'One entry per field the drafting tool filled. The work cannot publish while an entry is drafted and has no verified time.',
            id: 'Satu entri per bidang yang diisi alat draf. Karya tidak dapat diterbitkan selama ada entri yang masih draf tanpa waktu verifikasi.',
          },
        },
        hooks: { beforeDuplicate: [cleared] },
        fields: AI_DRAFTABLE_FIELDS.map((field) => ({
          name: field,
          type: 'group',
          label: AI_DRAFTABLE_LABELS[field],
          fields: [
            {
              name: 'drafted',
              type: 'checkbox',
              label: { en: 'Drafted', id: 'Dibuat draf' },
              defaultValue: false,
            },
            {
              name: 'verifiedBy',
              type: 'relationship',
              relationTo: 'users',
              label: { en: 'Verified by', id: 'Diverifikasi oleh' },
              admin: {
                description: { en: 'Who checked it.', id: 'Siapa yang memeriksanya.' },
              },
            },
            {
              name: 'verifiedAt',
              type: 'date',
              label: { en: 'Verified at', id: 'Diverifikasi pada' },
              admin: {
                date: { pickerAppearance: 'dayOnly' },
                description: {
                  en: 'When they checked it.',
                  id: 'Kapan mereka memeriksanya.',
                },
              },
            },
          ],
        })),
      },
    ],
  },
  {
    name: 'legacy',
    type: 'group',
    label: { en: 'From the old site', id: 'Dari situs lama' },
    access: STAFF_ONLY_ACCESS,
    admin: { readOnly: true },
    hooks: { beforeDuplicate: [cleared] },
    fields: [
      {
        type: 'row',
        fields: [
          {
            // CONTENT-MODEL.md §1's `legacy.id`: Payload 3.90 drops a field named `id` in a group.
            name: 'productId',
            type: 'number',
            label: { en: 'Product id', id: 'Id produk' },
            unique: true,
            index: true,
            admin: {
              description: {
                en: 'The old site’s product id: the public id it keeps.',
                id: 'Id produk situs lama: id publik yang dipertahankan.',
              },
            },
          },
          { name: 'sku', type: 'text', label: { en: 'SKU', id: 'SKU' }, maxLength: 80 },
        ],
      },
      { name: 'url', type: 'text', label: { en: 'URL', id: 'URL' }, maxLength: 2048 },
      {
        name: 'categories',
        type: 'text',
        label: { en: 'Categories', id: 'Kategori' },
        hasMany: true,
      },
    ],
  },
  {
    name: 'seo',
    type: 'group',
    label: { en: 'SEO', id: 'SEO' },
    fields: [
      {
        name: 'title',
        type: 'text',
        label: { en: 'Title', id: 'Judul' },
        localized: true,
        maxLength: 70,
      },
      {
        name: 'description',
        type: 'textarea',
        label: { en: 'Description', id: 'Deskripsi' },
        localized: true,
        maxLength: 200,
      },
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        label: { en: 'Image', id: 'Gambar' },
      },
    ],
  },
  translationStatusField,
]

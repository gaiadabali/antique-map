/**
 * The footer's fields (`./index`): titled columns of links, then the legal links, the line at the
 * very bottom and the words of the link to Indies Gallery. The links are `../shop-links`'s.
 */
import type { Field, Validate } from 'payload'
import { shopPagesOnly } from '../../site'
import { relationship } from 'payload/shared'

import { linkLabel, linkList } from '../shop-links'

/** Titled columns of links, then the legal links and the line under them. */
export const footerFields: Field[] = [
  {
    name: 'footerColumns',
    type: 'array',
    label: { en: 'Footer columns', id: 'Kolom footer' },
    maxRows: 5,
    labels: {
      singular: { en: 'Column', id: 'Kolom' },
      plural: { en: 'Columns', id: 'Kolom' },
    },
    admin: {
      // Unfolded, so a column just added is ready to fill in (the plan's §6: ≤ 0:30).
      description: {
        en: 'Each column has a title and its links. Contact details come from the settings’ Contact and social.',
        id: 'Setiap kolom punya judul dan tautannya. Detail kontak diambil dari Kontak dan sosial di pengaturan.',
      },
    },
    fields: [linkLabel(40), linkList('links', { en: 'Links', id: 'Tautan' }, 10)],
  },
  {
    name: 'legalLinks',
    type: 'array',
    label: { en: 'Legal links', id: 'Tautan legal' },
    maxRows: 6,
    labels: {
      singular: { en: 'Legal page', id: 'Halaman legal' },
      plural: { en: 'Legal pages', id: 'Halaman legal' },
    },
    admin: {
      description: {
        en: 'Privacy, terms, delivery and returns: shop pages, shown at the foot of every page.',
        id: 'Privasi, ketentuan, pengiriman dan pengembalian: halaman toko, tampil di kaki setiap halaman.',
      },
    },
    fields: [
      {
        name: 'page',
        type: 'relationship',
        relationTo: 'pages',
        // Required by validation, not `required`: a NOT NULL column would turn deleting a linked
        // page into a database error instead of the link simply going (ON DELETE SET NULL).
        validate: ((value, args) =>
          value === null || value === undefined
            ? 'Choose the legal page.'
            : (relationship as Validate)(value, args)) as Validate,
        filterOptions: shopPagesOnly,
        label: { en: 'Page', id: 'Halaman' },
      },
      {
        name: 'label',
        type: 'text',
        localized: true,
        maxLength: 60,
        label: { en: 'Label', id: 'Label' },
        admin: {
          description: { en: 'Empty: the page’s title.', id: 'Kosong: judul halamannya.' },
        },
      },
    ],
  },
  // Rarely changed: folded, so the first screen is the columns and the legal links (TASKS.md 27.6).
  {
    type: 'collapsible',
    label: { en: 'Bottom line and gallery link', id: 'Baris bawah dan tautan galeri' },
    admin: { initCollapsed: true },
    fields: [
      {
        name: 'copyright',
        type: 'text',
        localized: true,
        maxLength: 200,
        label: { en: 'Line at the very bottom', id: 'Baris paling bawah' },
        admin: {
          description: {
            en: 'Such as “© Old East Indies”. Empty: the site’s own line.',
            id: 'Misalnya “© Old East Indies”. Kosong: baris bawaan situs.',
          },
        },
      },
      {
        name: 'galleryLinkLabel',
        type: 'text',
        localized: true,
        maxLength: 60,
        label: { en: 'Link to Indies Gallery: label', id: 'Tautan ke Indies Gallery: label' },
        admin: {
          description: {
            en: 'The words of the link to the antiques site; its address is the gallery’s own. Empty: the site’s own words.',
            id: 'Kata-kata tautan ke situs barang antik; alamatnya milik galeri. Kosong: kata bawaan situs.',
          },
        },
      },
    ],
  },
]

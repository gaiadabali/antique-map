/**
 * The parts of `shop-header` (`./index`): the dated announcement above the header and the logo.
 * The main menu's links are `../shop-links`'s.
 */
import { IMAGES_ONLY } from '@engine/cms-core/collections/media/kinds'
import { isBlank } from '@engine/cms-core/fields'
import type { GroupField, PayloadRequest } from 'payload'

import { linkTarget } from '../shop-links'

type Announcement = { enabled?: unknown; startsAt?: unknown; endsAt?: unknown }

const defaultLocaleOf = (req: PayloadRequest) =>
  req.payload.config.localization ? req.payload.config.localization.defaultLocale : undefined

/**
 * The bar above the header (the plan's §3.5): shown while it is on and today is within its dates
 * (either may be empty). The site decides "today" at request time (TASKS.md 27.5).
 */
export const announcementGroup: GroupField = {
  name: 'announcement',
  type: 'group',
  label: { en: 'Announcement', id: 'Pengumuman' },
  admin: {
    description: {
      en: 'A short notice above the header on every shop page, such as a sale or a holiday closure.',
      id: 'Pemberitahuan singkat di atas header setiap halaman toko, misalnya promo atau libur.',
    },
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Show the announcement', id: 'Tampilkan pengumuman' },
    },
    {
      name: 'text',
      type: 'textarea',
      localized: true,
      maxLength: 300,
      label: { en: 'Text', id: 'Teks' },
      admin: { rows: 2 },
      validate: (value: unknown, { siblingData, req }) => {
        const on = (siblingData as Announcement | undefined)?.enabled === true
        const inDefault = req.locale === undefined || req.locale === defaultLocaleOf(req)
        return on && inDefault && isBlank(value)
          ? 'Write the announcement in English before switching it on.'
          : true
      },
    },
    {
      name: 'link',
      type: 'group',
      label: { en: 'Link (optional)', id: 'Tautan (opsional)' },
      fields: [linkTarget({ optional: true })],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          label: { en: 'From', id: 'Mulai' },
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
            description: { en: 'Empty: from now.', id: 'Kosong: mulai sekarang.' },
          },
        },
        {
          name: 'endsAt',
          type: 'date',
          label: { en: 'Until', id: 'Sampai' },
          validate: (value: unknown, { siblingData }) => {
            const startsAt = (siblingData as Announcement | undefined)?.startsAt
            if (!value || !startsAt) return true
            return new Date(String(value)) > new Date(String(startsAt))
              ? true
              : 'The end comes after the start.'
          },
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
            description: { en: 'Empty: until switched off.', id: 'Kosong: sampai dimatikan.' },
          },
        },
      ],
    },
  ],
}

export const logoGroup: GroupField = {
  name: 'logo',
  type: 'group',
  label: { en: 'Logo', id: 'Logo' },
  admin: {
    description: {
      en: 'Optional. Empty: the built-in Old East Indies logo.',
      id: 'Opsional. Kosong: logo Old East Indies bawaan.',
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'light',
          type: 'upload',
          relationTo: 'media',
          filterOptions: IMAGES_ONLY,
          label: { en: 'On a light background', id: 'Di latar terang' },
          admin: { width: '50%' },
        },
        {
          name: 'dark',
          type: 'upload',
          relationTo: 'media',
          filterOptions: IMAGES_ONLY,
          label: { en: 'On a dark background', id: 'Di latar gelap' },
          admin: { width: '50%' },
        },
      ],
    },
  ],
}

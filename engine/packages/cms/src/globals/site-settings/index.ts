/**
 * `site-settings` — one global holding the contact, AI, delivery and alert settings for each site
 * (CONTENT-MODEL.md §6, AI.md §1, COMMERCE.md §2, §4).
 *
 * Owner-only read and update. Editors and store staff cannot read it.
 */
import type { GlobalConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButOwner } from '../../admin/hidden'
import { isOwner } from '../../collections/users/roles'
import { invalidateSettingsOnChange } from '../../hooks/settings-invalidate'

export const SITE_SETTINGS_ACCESS = {
  read: isOwner,
  update: isOwner,
} as const

function contactGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'contact',
    type: 'group',
    label,
    fields: [
      {
        name: 'whatsapp',
        type: 'text',
        maxLength: 16,
        label: { en: 'WhatsApp', id: 'WhatsApp' },
        validate: (value: unknown) => {
          if (!value) return true
          return /^\+[1-9]\d{6,14}$/.test(String(value))
            ? true
            : 'Give a WhatsApp number in international format, such as +62 812 3456 7890.'
        },
      },
      {
        name: 'email',
        type: 'email',
        label: { en: 'Email', id: 'Email' },
      },
      {
        name: 'phone',
        type: 'text',
        maxLength: 24,
        label: { en: 'Phone', id: 'Telepon' },
      },
    ],
  }
}

function aiGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'ai',
    type: 'group',
    label,
    fields: [
      {
        name: 'chatEnabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Chat enabled', id: 'Chat aktif' },
      },
      {
        name: 'draftingEnabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Drafting enabled', id: 'Pembuatan draf aktif' },
      },
      {
        name: 'dailyBudgetUsd',
        type: 'number',
        min: 0,
        defaultValue: 5,
        label: { en: 'Daily budget (USD)', id: 'Anggaran harian (USD)' },
      },
      {
        name: 'sessionTokenCap',
        type: 'number',
        min: 0,
        defaultValue: 150_000,
        label: { en: 'Session token cap', id: 'Batas token per sesi' },
      },
    ],
  }
}

function socialField(): import('payload').ArrayField {
  return {
    name: 'social',
    type: 'array',
    label: { en: 'Social links', id: 'Tautan sosial' },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'platform',
            type: 'text',
            required: true,
            maxLength: 60,
            label: { en: 'Platform', id: 'Platform' },
          },
          {
            name: 'url',
            type: 'text',
            required: true,
            maxLength: 2048,
            label: { en: 'URL', id: 'URL' },
          },
        ],
      },
    ],
  }
}

function deliveryGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'delivery',
    type: 'group',
    label,
    fields: [
      {
        name: 'bands',
        type: 'array',
        label: { en: 'Distance bands', id: 'Gelombang jarak' },
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'upToKm',
                type: 'number',
                required: true,
                min: 0,
                label: { en: 'Up to km', id: 'Hingga km' },
                admin: { step: 0.1 },
              },
              {
                name: 'feeIdr',
                type: 'number',
                required: true,
                min: 0,
                label: { en: 'Fee (IDR)', id: 'Ongkir (IDR)' },
                admin: { step: 1 },
              },
            ],
          },
        ],
      },
      {
        name: 'freeOverIdr',
        type: 'number',
        min: 0,
        defaultValue: 500000,
        label: { en: 'Free delivery over (IDR)', id: 'Gratis ongkir di atas (IDR)' },
        admin: { step: 1 },
      },
    ],
  }
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site settings', id: 'Pengaturan situs' },
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromAllButOwner },
  access: SITE_SETTINGS_ACCESS,
  hooks: { afterChange: [invalidateSettingsOnChange] },
  fields: [
    {
      name: 'gallery',
      type: 'group',
      label: { en: 'Indies Gallery', id: 'Indies Gallery' },
      fields: [
        contactGroup({ en: 'Contact', id: 'Kontak' }),
        {
          name: 'replyPromise',
          type: 'text',
          localized: true,
          maxLength: 200,
          label: { en: 'Reply promise', id: 'Janji balas' },
        },
        {
          name: 'hours',
          type: 'textarea',
          localized: true,
          maxLength: 1000,
          label: { en: 'Hours', id: 'Jam' },
        },
        {
          name: 'announcement',
          type: 'textarea',
          localized: true,
          maxLength: 1000,
          label: { en: 'Announcement', id: 'Pengumuman' },
        },
        socialField(),
        {
          name: 'leadNotifyEmails',
          type: 'text',
          hasMany: true,
          maxLength: 320,
          validate: (value: unknown) => {
            if (!value) return true
            const emails = Array.isArray(value) ? value : [value]
            return emails.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
              ? true
              : 'Each entry must be an email address.'
          },
          label: { en: 'Lead notify emails', id: 'Email notifikasi calon pembeli' },
        },
        aiGroup({ en: 'AI', id: 'AI' }),
      ],
    },
    {
      name: 'shop',
      type: 'group',
      label: { en: 'Old East Indies', id: 'Old East Indies' },
      fields: [
        contactGroup({ en: 'Contact', id: 'Kontak' }),
        {
          name: 'replyPromise',
          type: 'text',
          localized: true,
          maxLength: 200,
          label: { en: 'Reply promise', id: 'Janji balas' },
        },
        {
          name: 'hours',
          type: 'textarea',
          localized: true,
          maxLength: 1000,
          label: { en: 'Hours', id: 'Jam' },
        },
        {
          name: 'announcement',
          type: 'textarea',
          localized: true,
          maxLength: 1000,
          label: { en: 'Announcement', id: 'Pengumuman' },
        },
        socialField(),
        {
          name: 'leadNotifyEmails',
          type: 'text',
          hasMany: true,
          maxLength: 320,
          validate: (value: unknown) => {
            if (!value) return true
            const emails = Array.isArray(value) ? value : [value]
            return emails.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
              ? true
              : 'Each entry must be an email address.'
          },
          label: { en: 'Lead notify emails', id: 'Email notifikasi calon pembeli' },
        },
        aiGroup({ en: 'AI', id: 'AI' }),
        {
          name: 'checkoutEnabled',
          type: 'checkbox',
          defaultValue: true,
          label: { en: 'Checkout enabled', id: 'Checkout aktif' },
        },
        deliveryGroup({ en: 'Delivery', id: 'Pengiriman' }),
        {
          name: 'welcomeDiscount',
          type: 'text',
          maxLength: 40,
          label: { en: 'Welcome discount code', id: 'Kode diskon selamat datang' },
          admin: {
            description: {
              en: 'The welcome code text for now. Task 3.3 relates this to discounts.',
              // 3.3 adds discounts
              id: 'Teks kode selamat datang untuk saat ini. Tugas 3.3 menghubungkannya dengan diskon.',
            },
          },
        },
        {
          name: 'orderExpiryMinutes',
          type: 'number',
          min: 1,
          defaultValue: 60,
          label: { en: 'Order expiry minutes', id: 'Menit kedaluwarsa pesanan' },
          admin: { step: 1 },
        },
        {
          // How long staff have to quote a delivery fee before an `awaiting_quote` order expires
          // and its stock is returned (TASKS.md 6.6); the buyer's own payment window starts once
          // the quote is set, and is the `orderExpiryMinutes` field above.
          name: 'quoteWindowMinutes',
          type: 'number',
          min: 15,
          max: 1440,
          defaultValue: 120,
          label: { en: 'Delivery-quote window (minutes)', id: 'Jendela ongkos kirim (menit)' },
          admin: { step: 1 },
        },
        {
          name: 'storeAlerts',
          type: 'checkbox',
          defaultValue: true,
          label: { en: 'Store alerts', id: 'Peringatan toko' },
        },
      ],
    },
  ],
}

/**
 * The shop's emails, as the owner words them (the plan's K4; TASKS.md 27.1.b, 27.3.d): each email
 * to a buyer or a store has a subject and an opening paragraph per language. What follows the
 * opening — the order's lines and totals, the links — stays the notifier's own
 * (`shop/notify/templates.ts`), so nothing here can break a link or a figure.
 *
 * Each default is the notifier's wording when this was made, so an untouched field sends what was
 * sent before. A field read empty (a database from before these fields) means the same default.
 * `{number}` stands for the order number and `{store}` for the store's name.
 */
import type { Field, GroupField } from 'payload'

import { ORDER_EMAILS, type EmailCopy } from './notification-copy'

export { ORDER_EMAILS, type EmailCopy, type OrderEmail } from './notification-copy'

const PLACEHOLDERS = {
  en: 'Write {number} for the order number and {store} for the store’s name.',
  id: 'Tulis {number} untuk nomor pesanan dan {store} untuk nama toko.',
}

const inLocale =
  (copy: { en: string; id: string }) =>
  ({ locale }: { locale?: unknown }) =>
    locale === 'id' ? copy.id : copy.en

function emailGroup(name: string, email: EmailCopy): GroupField {
  return {
    name,
    type: 'group',
    label: email.label,
    admin: { description: email.when },
    fields: [
      {
        name: 'subject',
        type: 'text',
        localized: true,
        maxLength: 150,
        label: { en: 'Subject', id: 'Subjek' },
        defaultValue: inLocale(email.subject),
      },
      {
        name: 'opening',
        type: 'textarea',
        localized: true,
        maxLength: 600,
        label: { en: 'Opening paragraph', id: 'Paragraf pembuka' },
        defaultValue: inLocale(email.opening),
        admin: { rows: 3 },
      },
    ],
  }
}

export const notificationFields: Field[] = [
  {
    name: 'storeAlerts',
    type: 'checkbox',
    defaultValue: true,
    label: { en: 'Store alerts', id: 'Peringatan toko' },
    admin: {
      description: {
        en: 'Alert store staff when an order needs them.',
        id: 'Beri peringatan ke staf toko saat ada pesanan yang perlu ditangani.',
      },
    },
  },
  {
    name: 'emails',
    type: 'group',
    label: { en: 'Emails', id: 'Email' },
    admin: {
      description: {
        en: `Each email’s subject and opening, per language. The order’s details and links follow automatically. ${PLACEHOLDERS.en}`,
        id: `Subjek dan pembuka setiap email, per bahasa. Rincian pesanan dan tautannya menyusul otomatis. ${PLACEHOLDERS.id}`,
      },
    },
    fields: Object.entries(ORDER_EMAILS).map(([name, email]) => emailGroup(name, email)),
  },
]

/**
 * The settings fields both sites' groups use (`./sites`, `./shop`): the reply promise, the hours,
 * who hears of a new lead — and the gallery's announcement.
 */
import type { Field } from 'payload'

export type Bilingual = { en: string; id: string }

export const replyPromise = (): Field => ({
  name: 'replyPromise',
  type: 'text',
  localized: true,
  maxLength: 200,
  label: { en: 'Reply promise', id: 'Janji balas' },
  admin: {
    description: {
      en: 'One line telling visitors how fast you answer, such as "We reply within a day".',
      id: 'Satu kalimat untuk pengunjung tentang kecepatan balasan, misalnya "Kami membalas dalam sehari".',
    },
  },
})

export const hours = (): Field => ({
  name: 'hours',
  type: 'textarea',
  localized: true,
  maxLength: 1000,
  label: { en: 'Hours', id: 'Jam' },
})

/**
 * The gallery's announcement. The shop has none here: its announcement is `shop-header`'s, with
 * dates and a link.
 */
export const announcement = (): Field => ({
  name: 'announcement',
  type: 'textarea',
  localized: true,
  maxLength: 1000,
  label: { en: 'Announcement', id: 'Pengumuman' },
  admin: {
    description: {
      en: 'A notice shown to visitors of this site, such as a holiday closure. Leave empty for none.',
      id: 'Pengumuman untuk pengunjung situs ini, misalnya libur. Kosongkan jika tidak ada.',
    },
  },
})

export const leadNotifyEmails = (): Field => ({
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
  admin: {
    description: {
      en: 'These addresses get an email when a new enquiry arrives.',
      id: 'Alamat ini menerima email saat ada pertanyaan baru.',
    },
  },
})

export const AI: Bilingual = { en: 'AI', id: 'AI' }
export const CONTACT: Bilingual = { en: 'Contact', id: 'Kontak' }

/**
 * The settings fields both sites' groups use (`./sites`, `./shop`): the reply promise, the hours,
 * the announcement and who hears of a new lead.
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

const ANNOUNCEMENT_NOTE: Bilingual = {
  en: 'A notice shown to visitors of this site, such as a holiday closure. Leave empty for none.',
  id: 'Pengumuman untuk pengunjung situs ini, misalnya libur. Kosongkan jika tidak ada.',
}

/** Where the shop's announcement now lives; this field shows only while it still holds text. */
const MOVED_NOTE: Bilingual = {
  en: 'Moved to Menu and footer → Announcement, which has dates and a link. The site shows this text until it reads the new one; clear it once you have copied it there.',
  id: 'Dipindah ke Menu dan footer → Pengumuman, yang punya tanggal dan tautan. Situs menampilkan teks ini sampai membaca yang baru; kosongkan setelah Anda menyalinnya ke sana.',
}

/**
 * The site's announcement. `moved`: the shop's, replaced by `shop-header.announcement` —
 * kept (the site still reads it) but shown only while it holds text, so nobody starts a new one here.
 */
export const announcement = (options: { moved?: boolean } = {}): Field => ({
  name: 'announcement',
  type: 'textarea',
  localized: true,
  maxLength: 1000,
  label: { en: 'Announcement', id: 'Pengumuman' },
  admin: {
    description: options.moved ? MOVED_NOTE : ANNOUNCEMENT_NOTE,
    ...(options.moved
      ? {
          condition: (_data: unknown, sibling: { announcement?: unknown } | undefined) =>
            typeof sibling?.announcement === 'string' && sibling.announcement.trim() !== '',
        }
      : {}),
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

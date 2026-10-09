/**
 * The two per-site tabs of `site-settings`. Each site's named group (`gallery`, `shop`) keeps its
 * data path; the tabs around it, and the tabs inside the shop's group, are unnamed — presentation
 * only. Field order inside a group is unchanged (it fixes the order of `payload-types.ts`), so the
 * shop's inner tabs each wrap a run of neighbouring fields.
 */
import type { Field, Tab } from 'payload'

import { aiGroup, contactGroup, deliveryGroup, socialField } from './fields'

type Bilingual = { en: string; id: string }

const replyPromise = (): Field => ({
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

const hours = (): Field => ({
  name: 'hours',
  type: 'textarea',
  localized: true,
  maxLength: 1000,
  label: { en: 'Hours', id: 'Jam' },
})

const announcement = (): Field => ({
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

const leadNotifyEmails = (): Field => ({
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

const AI: Bilingual = { en: 'AI', id: 'AI' }
const CONTACT: Bilingual = { en: 'Contact', id: 'Kontak' }

export const galleryTab: Tab = {
  label: { en: 'Indies Gallery', id: 'Indies Gallery' },
  description: {
    en: 'Settings for the antiques site. It has no checkout, so there is no delivery here.',
    id: 'Pengaturan situs barang antik. Situs ini tanpa checkout, jadi tidak ada pengiriman.',
  },
  fields: [
    {
      name: 'gallery',
      type: 'group',
      label: { en: 'Indies Gallery', id: 'Indies Gallery' },
      fields: [
        contactGroup(CONTACT),
        replyPromise(),
        hours(),
        announcement(),
        socialField(),
        leadNotifyEmails(),
        aiGroup(AI),
      ],
    },
  ],
}

export const shopTab: Tab = {
  label: { en: 'Old East Indies', id: 'Old East Indies' },
  description: {
    en: 'Settings for the online shop: contact, the chat helper, checkout and delivery, alerts.',
    id: 'Pengaturan toko daring: kontak, asisten chat, checkout dan pengiriman, peringatan.',
  },
  fields: [
    {
      name: 'shop',
      type: 'group',
      label: { en: 'Old East Indies', id: 'Old East Indies' },
      fields: [
        {
          type: 'tabs',
          tabs: [
            {
              label: { en: 'Contact and notices', id: 'Kontak dan pengumuman' },
              fields: [
                contactGroup(CONTACT),
                replyPromise(),
                hours(),
                announcement(),
                socialField(),
                leadNotifyEmails(),
              ],
            },
            { label: { en: 'Chat and AI', id: 'Chat dan AI' }, fields: [aiGroup(AI)] },
            {
              label: { en: 'Checkout and delivery', id: 'Checkout dan pengiriman' },
              fields: [
                {
                  name: 'checkoutEnabled',
                  type: 'checkbox',
                  defaultValue: true,
                  label: { en: 'Checkout enabled', id: 'Checkout aktif' },
                  admin: {
                    description: {
                      en: 'Turn off to stop new orders, for example while stock is being counted.',
                      id: 'Matikan untuk menghentikan pesanan baru, misalnya saat stok dihitung.',
                    },
                  },
                },
                deliveryGroup({ en: 'Delivery', id: 'Pengiriman' }),
                {
                  name: 'welcomeDiscount',
                  type: 'text',
                  maxLength: 40,
                  label: { en: 'Welcome discount code', id: 'Kode diskon selamat datang' },
                  admin: {
                    description: {
                      en: 'The code new buyers see. Create the code itself under Discount codes first.',
                      id: 'Kode yang dilihat pembeli baru. Buat dulu kodenya di menu Kode diskon.',
                    },
                  },
                },
                {
                  name: 'orderExpiryMinutes',
                  type: 'number',
                  min: 1,
                  defaultValue: 60,
                  label: { en: 'Order expiry minutes', id: 'Menit kedaluwarsa pesanan' },
                  admin: {
                    step: 1,
                    description: {
                      en: 'How long a buyer has to pay once the delivery fee is set. After that the order is cancelled and the stock goes back on sale.',
                      id: 'Berapa lama pembeli punya waktu membayar setelah ongkir ditetapkan. Setelah itu pesanan dibatalkan dan stok dijual kembali.',
                    },
                  },
                },
                {
                  // How long staff have to quote a delivery fee before an `awaiting_quote` order
                  // expires and its stock is returned (TASKS.md 6.6); the buyer's own payment
                  // window starts once the quote is set, and is `orderExpiryMinutes` above.
                  name: 'quoteWindowMinutes',
                  type: 'number',
                  min: 15,
                  max: 1440,
                  defaultValue: 120,
                  label: {
                    en: 'Delivery-quote window (minutes)',
                    id: 'Jendela ongkos kirim (menit)',
                  },
                  admin: {
                    step: 1,
                    description: {
                      en: 'How long staff have to enter the delivery fee on a new order before it is cancelled and its stock returned.',
                      id: 'Berapa lama staf punya waktu mengisi ongkir pada pesanan baru sebelum pesanan dibatalkan dan stoknya dikembalikan.',
                    },
                  },
                },
              ],
            },
            {
              label: { en: 'Alerts', id: 'Peringatan' },
              fields: [
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
              ],
            },
          ],
        },
      ],
    },
  ],
}

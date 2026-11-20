/**
 * The shop's "Promotions" settings (TASKS.md 28.1; the owner's feedback of 2026-11-19): the
 * same-day delivery promise on the landing and shop pages, and the newsletter pop-up.
 *
 * - **`promo`** — a promise, not a price rule (F9): the banner's words and its condition, and the
 *   weekday cut-off with its time zone, which the storefront reads to say "today" or "tomorrow".
 *   The free delivery above Rp 500.000 is the delivery's existing `freeOverIdr`; nothing here
 *   changes what an order costs.
 * - **`newsletter`** — the pop-up on a first visit to the landing page; sign-ups are leads of kind
 *   `newsletter` (F8).
 *
 * The words default in each language (`STOREFRONT_COPY`); the seed writes them into a database
 * that has none (`../../../seed/vocabulary/storefront`).
 */
import type { Field } from 'payload'

type Words = { readonly en: string; readonly id: string }

/** The default words, in both languages. */
export const STOREFRONT_COPY = {
  promoText: {
    en: 'Free Same Day Delivery in Bali*',
    id: 'Gratis Antar di Hari yang Sama di Bali*',
  },
  promoCondition: {
    en: '*Orders above Rp 500.000, weekdays before 15:30; after 15:30 delivered the next day.',
    id: '*Pesanan di atas Rp 500.000, hari kerja sebelum pukul 15.30; setelah 15.30 diantar keesokan harinya.',
  },
  newsletterTitle: {
    en: 'Join our newsletter',
    id: 'Berlangganan buletin kami',
  },
  newsletterText: {
    en: 'New prints, new stores and the odd offer — now and then, never often.',
    id: 'Cetakan baru, toko baru, dan sesekali penawaran — sesekali saja, tidak sering.',
  },
} as const satisfies Record<string, Words>

export const PROMO_CUTOFF_DEFAULT = '15:30'
export const PROMO_TIME_ZONES = ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura'] as const
export const PROMO_TIME_ZONE_DEFAULT = 'Asia/Makassar'

const inLocale =
  (words: Words) =>
  ({ locale }: { locale?: string }): string =>
    locale === 'id' ? words.id : words.en

const validateCutoff = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    ? true
    : 'A time of day as HH:MM, e.g. 15:30.'

const promo: Field = {
  name: 'promo',
  type: 'group',
  label: { en: 'Same-day delivery promise', id: 'Janji antar di hari yang sama' },
  admin: {
    description: {
      en: 'The banner on the home and shop pages. It promises; it does not change a price — free delivery above an amount is set under Checkout and delivery.',
      id: 'Spanduk di beranda dan halaman toko. Ini janji, bukan harga — gratis ongkir di atas jumlah tertentu diatur di Checkout dan pengiriman.',
    },
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Show the banner', id: 'Tampilkan spanduk' },
    },
    {
      name: 'text',
      type: 'text',
      localized: true,
      maxLength: 120,
      defaultValue: inLocale(STOREFRONT_COPY.promoText),
      label: { en: 'Banner text', id: 'Teks spanduk' },
    },
    {
      name: 'condition',
      type: 'textarea',
      localized: true,
      maxLength: 300,
      defaultValue: inLocale(STOREFRONT_COPY.promoCondition),
      label: { en: 'Condition (the small print)', id: 'Syarat (tulisan kecil)' },
      admin: { rows: 2 },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'cutoff',
          type: 'text',
          maxLength: 5,
          defaultValue: PROMO_CUTOFF_DEFAULT,
          validate: validateCutoff,
          label: { en: 'Order by (HH:MM)', id: 'Pesan sebelum (JJ:MM)' },
          admin: {
            width: '33%',
            description: {
              en: 'Ordered after this, it is delivered the next day.',
              id: 'Dipesan setelah ini, diantar keesokan harinya.',
            },
          },
        },
        {
          name: 'timeZone',
          type: 'select',
          defaultValue: PROMO_TIME_ZONE_DEFAULT,
          options: PROMO_TIME_ZONES.map((value) => ({ value, label: value })),
          label: { en: 'Time zone', id: 'Zona waktu' },
          admin: { width: '33%' },
        },
        {
          name: 'weekdaysOnly',
          type: 'checkbox',
          defaultValue: true,
          label: { en: 'Weekdays only', id: 'Hanya hari kerja' },
          admin: { width: '33%' },
        },
      ],
    },
  ],
}

const newsletter: Field = {
  name: 'newsletter',
  type: 'group',
  label: { en: 'Newsletter pop-up', id: 'Pop-up buletin' },
  admin: {
    description: {
      en: 'Asks a first-time visitor of the home page for their email. Sign-ups arrive as leads of kind Newsletter sign-up.',
      id: 'Meminta email pengunjung baru di beranda. Pendaftaran masuk sebagai calon berjenis Pendaftaran buletin.',
    },
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Show the pop-up', id: 'Tampilkan pop-up' },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 80,
      defaultValue: inLocale(STOREFRONT_COPY.newsletterTitle),
      label: { en: 'Title', id: 'Judul' },
    },
    {
      name: 'text',
      type: 'textarea',
      localized: true,
      maxLength: 300,
      defaultValue: inLocale(STOREFRONT_COPY.newsletterText),
      label: { en: 'Text', id: 'Teks' },
      admin: { rows: 2 },
    },
  ],
}

export const storefrontFields: Field[] = [promo, newsletter]

/**
 * The product page's fixed words (the plan's §3.4; TASKS.md 27.1.b, 27.5.c): the two signals under
 * the price, the delivery line and the help for the finishes — until now in the shop's lexicon
 * (`product.signalPaper`, `product.signalWorkshop`, `product.delivery`, `product.finishHelpLabel`,
 * `product.finishHelp`), whose words are the defaults here. A field read empty (a database from
 * before these fields) means the lexicon's words.
 *
 * `{freeOver}` in the delivery line stands for the free-delivery amount of the delivery settings,
 * so the figure is set once.
 */
import type { Field } from 'payload'

type Bilingual = { en: string; id: string }

export const PRODUCT_PAGE_COPY = {
  signalFirst: { en: '300gsm cotton · archival inks', id: 'Katun 300gsm · tinta arsip' },
  signalSecond: { en: 'Printed in our own workshop', id: 'Dicetak di workshop kami sendiri' },
  deliveryLine: {
    en: 'Sent from the nearest store by Gojek or Grab. The fee shows at checkout once you drop a pin — free over {freeOver}.',
    id: 'Dikirim dari toko terdekat lewat Gojek atau Grab. Biayanya muncul saat checkout setelah Anda pasang pin — gratis di atas {freeOver}.',
  },
  finishHelpLabel: {
    en: 'What do mounted and framed mean?',
    id: 'Apa arti mounted dan framed?',
  },
  finishHelp: {
    en: 'Mounted: the print on a thick white mount board, ready to frame. Framed: the same, in a frame, ready to hang.',
    id: 'Mounted: cetakan di atas papan mount putih tebal, siap dibingkai. Framed: sama, sudah dalam bingkai, siap digantung.',
  },
} as const satisfies Record<string, Bilingual>

const inLocale =
  (copy: Bilingual) =>
  ({ locale }: { locale?: unknown }) =>
    locale === 'id' ? copy.id : copy.en

/** A line, or a paragraph past 100 characters, translated, defaulting to today's words. */
const words = (
  name: keyof typeof PRODUCT_PAGE_COPY,
  label: Bilingual,
  maxLength: number,
  note?: Bilingual,
): Field =>
  ({
    name,
    type: maxLength > 100 ? 'textarea' : 'text',
    localized: true,
    maxLength,
    label,
    defaultValue: inLocale(PRODUCT_PAGE_COPY[name]),
    ...(note ? { admin: { description: note } } : {}),
  }) as Field

export const productPageFields: Field[] = [
  {
    name: 'productPage',
    type: 'group',
    label: { en: 'Product page', id: 'Halaman produk' },
    admin: {
      description: {
        en: 'The words every product page shows beside the product’s own.',
        id: 'Teks yang tampil di setiap halaman produk, di samping teks produknya sendiri.',
      },
    },
    fields: [
      {
        type: 'row',
        fields: [
          words('signalFirst', { en: 'First signal', id: 'Keunggulan pertama' }, 80),
          words('signalSecond', { en: 'Second signal', id: 'Keunggulan kedua' }, 80),
        ],
      },
      words('deliveryLine', { en: 'Delivery line', id: 'Baris pengiriman' }, 300, {
        en: 'Under the button. {freeOver} becomes the free-delivery amount set under Checkout and delivery.',
        id: 'Di bawah tombol. {freeOver} menjadi batas gratis ongkir yang diatur di Checkout dan pengiriman.',
      }),
      words(
        'finishHelpLabel',
        { en: 'Finishes: the question', id: 'Finishing: pertanyaannya' },
        80,
        {
          en: 'Shown beside the options when a product comes mounted or framed.',
          id: 'Tampil di samping pilihan saat produk tersedia mounted atau framed.',
        },
      ),
      words('finishHelp', { en: 'Finishes: the answer', id: 'Finishing: jawabannya' }, 400),
    ],
  },
]

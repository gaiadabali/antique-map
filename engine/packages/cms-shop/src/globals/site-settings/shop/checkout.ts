/**
 * The shop's "Checkout and delivery" settings (COMMERCE.md §2, §4–§5; the plan's K2): checkout on
 * or off, the delivery table, the welcome discount, and the two windows an order has.
 *
 * **One delivery model** (K2): checkout prices delivery from the distance bands; a staff quote is
 * the exception, for an address beyond the last band. The fields say so; the order code follows
 * in TASKS.md 27.3 (today every order still waits for a quote).
 *
 * **The welcome discount is picked** (`welcomeOffer`, a `discounts` record), never typed. The code
 * the checkout reads today (`welcomeDiscount`, text) is kept, hidden, and written from the pick on
 * every save that sets or clears it (`keepCodeInStep`), so the order code works unchanged until it
 * reads the pick itself. The phase-27 migration set each existing code's pick.
 */
import { deliveryGroup } from '@engine/cms-core/globals/site-settings'
import type { Field, FieldHook } from 'payload'

type Sibling = { welcomeDiscount?: unknown }

const idOf = (value: unknown): unknown =>
  typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value

const isId = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isSafeInteger(value)) ||
  (typeof value === 'string' && value.trim() !== '')

/**
 * `welcomeDiscount` follows `welcomeOffer`: the picked record's code, or none once the pick is
 * cleared. A save that leaves the pick as it was empty (an older writer setting the code alone)
 * leaves the code alone.
 */
export const keepCodeInStep: FieldHook = async ({ value, siblingData, originalDoc, req }) => {
  const sibling = siblingData as Sibling
  const picked = idOf(value)
  if (isId(picked)) {
    const discount = (await req.payload.findByID({
      collection: 'discounts',
      id: picked,
      depth: 0,
      select: { code: true },
      overrideAccess: true,
      disableErrors: true,
      req,
    })) as { code?: unknown } | null
    sibling.welcomeDiscount = typeof discount?.code === 'string' ? discount.code : ''
    return value
  }
  const before = (originalDoc as { shop?: { welcomeOffer?: unknown } } | undefined)?.shop
  if (value === null && isId(idOf(before?.welcomeOffer))) sibling.welcomeDiscount = ''
  return value
}

export const checkoutFields: Field[] = [
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
    name: 'welcomeOffer',
    type: 'relationship',
    relationTo: 'discounts',
    label: { en: 'Welcome discount', id: 'Diskon selamat datang' },
    hooks: { beforeValidate: [keepCodeInStep] },
    admin: {
      description: {
        en: 'The discount new buyers are offered. Pick one of your discount codes; empty offers none.',
        id: 'Diskon yang ditawarkan kepada pembeli baru. Pilih salah satu kode diskon Anda; kosong berarti tidak ada.',
      },
    },
  },
  {
    // The code the checkout reads until it reads `welcomeOffer` (`keepCodeInStep`); never typed.
    name: 'welcomeDiscount',
    type: 'text',
    maxLength: 40,
    label: { en: 'Welcome discount code', id: 'Kode diskon selamat datang' },
    admin: { hidden: true },
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
        en: 'How long a buyer has to pay once the delivery fee is known. After that the order is cancelled and the stock goes back on sale.',
        id: 'Berapa lama pembeli punya waktu membayar setelah ongkir diketahui. Setelah itu pesanan dibatalkan dan stok dijual kembali.',
      },
    },
  },
  {
    // How long staff have to quote a delivery fee before an `awaiting_quote` order expires and
    // its stock is returned (TASKS.md 6.6); the buyer's own payment window starts once the quote
    // is set, and is `orderExpiryMinutes` above.
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
        en: 'For an order whose address is beyond the last distance band: how long staff have to enter its delivery fee before it is cancelled and its stock returned.',
        id: 'Untuk pesanan yang alamatnya di luar rentang jarak terakhir: berapa lama staf punya waktu mengisi ongkirnya sebelum pesanan dibatalkan dan stoknya dikembalikan.',
      },
    },
  },
]

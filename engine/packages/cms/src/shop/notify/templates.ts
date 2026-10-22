/**
 * The notifier's bilingual copy (COMMERCE.md §11, §10): plain text with a simple HTML twin, built
 * from the shop lexicon's words — these are the English neutral defaults and their Indonesian
 * translation, kept together because an email is sent once and never localised again by the
 * browser. A later pass can move these into the lexicon files proper if the shop ever wants to
 * edit emails without a deploy; nothing here depends on that not happening.
 */
import type { OrderStatus } from '../../collections/orders/statuses'
import type { MailMessage } from './transport'

type Lang = 'en' | 'id'

const STATUS_LINE: Partial<Record<OrderStatus, Record<Lang, string>>> = {
  awaiting_quote: {
    en: 'We’re confirming your delivery price — we’ll email you shortly with the total.',
    id: 'Kami sedang memastikan ongkos kirim Anda — kami akan mengirim email sebentar lagi dengan totalnya.',
  },
  paid: {
    en: 'We’ve received your payment — your order is being prepared.',
    id: 'Pembayaran Anda telah kami terima — pesanan sedang disiapkan.',
  },
  processing: {
    en: 'Your order is being packed.',
    id: 'Pesanan Anda sedang dikemas.',
  },
  waiting_driver: {
    en: 'Your order is ready and waiting for a driver.',
    id: 'Pesanan Anda siap dan menunggu pengemudi.',
  },
  on_the_way: {
    en: 'Your order has been picked up and is on the way.',
    id: 'Pesanan Anda telah diambil dan sedang dalam perjalanan.',
  },
  delivered: {
    en: 'Your order has been delivered. Thank you for shopping with us.',
    id: 'Pesanan Anda telah terkirim. Terima kasih telah berbelanja bersama kami.',
  },
  cancelled: {
    en: 'Your order has been cancelled.',
    id: 'Pesanan Anda telah dibatalkan.',
  },
  expired: {
    en: 'The time to pay for your order has run out.',
    id: 'Batas waktu pembayaran pesanan Anda telah berakhir.',
  },
}

const SUBJECT: Record<Lang, (orderNumber: number) => string> = {
  en: (n) => `Order #${n} — update`,
  id: (n) => `Pesanan #${n} — pembaruan`,
}

const GREETING: Record<Lang, string> = {
  en: 'Hello,',
  id: 'Halo,',
}

const TRACK_LINE: Record<Lang, string> = {
  en: 'Follow your order:',
  id: 'Pantau pesanan Anda:',
}

const PAY_LINE: Record<Lang, string> = {
  en: 'Pay here:',
  id: 'Bayar di sini:',
}

const DRIVER_LINE: Record<Lang, string> = {
  en: 'The driver’s details:',
  id: 'Data pengemudi:',
}

const SIGN_OFF: Record<Lang, string> = {
  en: 'Old East Indies',
  id: 'Old East Indies',
}

export type BuyerStatusEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly orderNumber: number
  readonly status: OrderStatus
  readonly trackingUrl: string
  /** A short-lived presigned URL, only on `on_the_way` once a driver image is attached. */
  readonly driverImageUrl?: string | null
}

/** `null` when `status` has no buyer-facing line (only `pending_payment` today). */
export function buyerStatusEmail(input: BuyerStatusEmailInput): MailMessage | null {
  const line = STATUS_LINE[input.status]?.[input.locale]
  if (line === undefined) return null
  const lang = input.locale
  const lines = [GREETING[lang], '', line, '', `${TRACK_LINE[lang]} ${input.trackingUrl}`]
  if (input.driverImageUrl) {
    lines.push('', `${DRIVER_LINE[lang]} ${input.driverImageUrl}`)
  }
  lines.push('', SIGN_OFF[lang])
  const text = lines.join('\n')
  const html = lines
    .map((row) =>
      row === ''
        ? '<br />'
        : row.includes('http')
          ? `<p>${row.replace(/(https?:\/\/\S+)/, '<a href="$1">$1</a>')}</p>`
          : `<p>${row}</p>`,
    )
    .join('\n')
  return { to: input.to, subject: SUBJECT[lang](input.orderNumber), text, html }
}

const QUOTE_READY_SUBJECT: Record<Lang, (orderNumber: number) => string> = {
  en: (n) => `Order #${n} — your delivery price is ready`,
  id: (n) => `Pesanan #${n} — ongkos kirim Anda sudah siap`,
}

const QUOTE_READY_INTRO: Record<Lang, string> = {
  en: 'Your price is ready:',
  id: 'Harga Anda sudah siap:',
}

const ITEMS_LINE: Record<Lang, (amount: string) => string> = {
  en: (amount) => `Items: ${amount}`,
  id: (amount) => `Barang: ${amount}`,
}

const DELIVERY_FEE_LINE: Record<Lang, (amount: string) => string> = {
  en: (amount) => `Delivery: ${amount}`,
  id: (amount) => `Pengiriman: ${amount}`,
}

const TOTAL_LINE: Record<Lang, (amount: string) => string> = {
  en: (amount) => `Total: ${amount}`,
  id: (amount) => `Total: ${amount}`,
}

const PAY_BY_LINE: Record<Lang, (time: string) => string> = {
  en: (time) => `Please pay by ${time}.`,
  id: (time) => `Mohon bayar sebelum ${time}.`,
}

const rupiahOf = (amountIdr: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amountIdr)

export type QuoteReadyEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly orderNumber: number
  /** `totals.subtotal − totals.discount`: the items' own total, before delivery. */
  readonly itemsTotalIdr: number
  readonly deliveryFeeIdr: number
  readonly totalIdr: number
  /** `orders.expiresAt`, the buyer's new payment window; `null` shows no deadline sentence. */
  readonly payBy: string | null
  /** The buyer's order page (`/order/{token}`) — where they pay, never the tracking page. */
  readonly payUrl: string
}

/** "Your price is ready" (TASKS.md 6.6): the quote move's own email, never the generic status line. */
export function quoteReadyEmail(input: QuoteReadyEmailInput): MailMessage {
  const lang = input.locale
  const payByText =
    input.payBy === null
      ? null
      : new Date(input.payBy).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
  const lines = [
    GREETING[lang],
    '',
    QUOTE_READY_INTRO[lang],
    ITEMS_LINE[lang](rupiahOf(input.itemsTotalIdr)),
    DELIVERY_FEE_LINE[lang](rupiahOf(input.deliveryFeeIdr)),
    TOTAL_LINE[lang](rupiahOf(input.totalIdr)),
    ...(payByText === null ? [] : [PAY_BY_LINE[lang](payByText)]),
    '',
    `${PAY_LINE[lang]} ${input.payUrl}`,
    '',
    SIGN_OFF[lang],
  ]
  const text = lines.join('\n')
  const html = lines
    .map((row) =>
      row === ''
        ? '<br />'
        : row.includes('http')
          ? `<p>${row.replace(/(https?:\/\/\S+)/, '<a href="$1">$1</a>')}</p>`
          : `<p>${row}</p>`,
    )
    .join('\n')
  return { to: input.to, subject: QUOTE_READY_SUBJECT[lang](input.orderNumber), text, html }
}

const RESEND_SUBJECT: Record<Lang, string> = {
  en: 'Your tracking link',
  id: 'Tautan pelacakan Anda',
}

const RESEND_LINE: Record<Lang, string> = {
  en: 'Here is the link to follow your order:',
  id: 'Berikut tautan untuk memantau pesanan Anda:',
}

export type ResendTrackingEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly trackingUrl: string
}

/** "Find my order"'s email (TASKS.md 7.3.a): the link alone, not tied to any status. */
export function resendTrackingEmail(input: ResendTrackingEmailInput): MailMessage {
  const lang = input.locale
  const lines = [GREETING[lang], '', RESEND_LINE[lang], input.trackingUrl, '', SIGN_OFF[lang]]
  const text = lines.join('\n')
  const html = lines
    .map((row) =>
      row === ''
        ? '<br />'
        : row.includes('http')
          ? `<p><a href="${row}">${row}</a></p>`
          : `<p>${row}</p>`,
    )
    .join('\n')
  return { to: input.to, subject: RESEND_SUBJECT[lang], text, html }
}

export type StoreNewOrderEmailInput = {
  readonly to: string
  readonly orderNumber: number
  readonly storeName: string
  readonly itemSummary: string
  readonly totalIdr: number
  readonly adminUrl: string
}

/** One store user's email on a newly paid order assigned to their store — bilingual, staff read both. */
export function storeNewOrderEmail(input: StoreNewOrderEmailInput): MailMessage {
  const rupiah = rupiahOf(input.totalIdr)
  const lines = [
    `New paid order #${input.orderNumber} for ${input.storeName}`,
    `Pesanan #${input.orderNumber} yang sudah dibayar untuk ${input.storeName}`,
    '',
    `Items / Barang: ${input.itemSummary}`,
    `Total: ${rupiah}`,
    '',
    `Open it in the admin / Buka di admin: ${input.adminUrl}`,
  ]
  return {
    to: input.to,
    subject: `New order #${input.orderNumber} — ${input.storeName}`,
    text: lines.join('\n'),
    html: lines.map((row) => (row === '' ? '<br />' : `<p>${row}</p>`)).join('\n'),
  }
}

export type StoreReassignedEmailInput = StoreNewOrderEmailInput

/** One store user's email when an order is reassigned to their store (TASKS.md 6.6, 7.1.c). */
export function storeReassignedEmail(input: StoreReassignedEmailInput): MailMessage {
  const rupiah = rupiahOf(input.totalIdr)
  const lines = [
    `Order #${input.orderNumber} has been reassigned to ${input.storeName}`,
    `Pesanan #${input.orderNumber} telah dipindahkan ke ${input.storeName}`,
    '',
    `Items / Barang: ${input.itemSummary}`,
    `Total: ${rupiah}`,
    '',
    `Open it in the admin / Buka di admin: ${input.adminUrl}`,
  ]
  return {
    to: input.to,
    subject: `Order #${input.orderNumber} reassigned — ${input.storeName}`,
    text: lines.join('\n'),
    html: lines.map((row) => (row === '' ? '<br />' : `<p>${row}</p>`)).join('\n'),
  }
}

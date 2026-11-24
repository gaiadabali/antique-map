/**
 * The order page's WhatsApp buttons (the plan's K5; TASKS.md 27.3.b): plain `wa.me` links with a
 * prepared message — no paid API, nothing sent by the server. One to the buyer, in the buyer's
 * language, and one to the order's store, in the admin's. Pure: the page passes in what it read.
 *
 * The buyer's message names the order and, before payment, carries the buyer's own order-page link
 * (where they pay; `loadOrderPayLink`). The store's names the order, its items and the drop-off
 * area — never the buyer's phone or address, which the store's own staff read in the admin.
 */
import type { OrderStatus } from '../../collections/orders/statuses'

type Lang = 'en' | 'id'

/** `https://wa.me/<digits>?text=…`, or `null` when the number has too few digits to dial. */
export function waLink(phone: unknown, text: string): string | null {
  if (typeof phone !== 'string') return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  const local = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${local}?text=${encodeURIComponent(text)}`
}

const BUYER_OPENING: Record<Lang, (name: string, number: number) => string> = {
  en: (name, number) => `Hello ${name}, this is Old East Indies about your order #${number}.`,
  id: (name, number) => `Halo ${name}, kami dari Old East Indies tentang pesanan Anda #${number}.`,
}

const BUYER_STATUS: Partial<Record<OrderStatus, Record<Lang, string>>> = {
  awaiting_quote: {
    en: 'We are confirming your delivery price and will send it shortly.',
    id: 'Kami sedang memastikan ongkos kirim Anda dan akan segera mengirimkannya.',
  },
  pending_payment: {
    en: 'Your order is ready to pay here:',
    id: 'Pesanan Anda siap dibayar di sini:',
  },
  paid: {
    en: 'We have your payment and are preparing your order.',
    id: 'Pembayaran sudah kami terima dan pesanan sedang disiapkan.',
  },
  processing: { en: 'Your order is being packed.', id: 'Pesanan Anda sedang dikemas.' },
  waiting_driver: {
    en: 'Your order is packed and a driver is on the way to collect it.',
    id: 'Pesanan Anda sudah dikemas dan pengemudi sedang menuju untuk mengambilnya.',
  },
  on_the_way: { en: 'Your order is on the way to you.', id: 'Pesanan Anda sedang diantar.' },
  delivered: {
    en: 'Your order has been delivered. Thank you!',
    id: 'Pesanan Anda sudah terkirim. Terima kasih!',
  },
}

/** The buyer's prepared message, in their language; `payLink` only before payment. */
export function buyerMessage(input: {
  readonly locale: Lang
  readonly name: string
  readonly number: number
  readonly status: OrderStatus
  readonly payLink?: string | null
}): string {
  const opening = BUYER_OPENING[input.locale](input.name.trim() || '—', input.number)
  const line = BUYER_STATUS[input.status]?.[input.locale]
  const beforePayment = input.status === 'awaiting_quote' || input.status === 'pending_payment'
  const link = beforePayment && input.payLink ? input.payLink : null
  return [opening, line, link].filter(Boolean).join(' ')
}

const STORE_TEXT: Record<Lang, (number: number, items: string, area: string) => string> = {
  en: (number, items, area) => `Order #${number}: ${items}. Drop-off: ${area}.`,
  id: (number, items, area) => `Pesanan #${number}: ${items}. Tujuan: ${area}.`,
}

/** The store's prepared message, in the admin's language: the order, its items, the area. */
export function storeMessage(input: {
  readonly language: Lang
  readonly number: number
  readonly lines: readonly { readonly qty?: unknown; readonly name?: unknown }[]
  readonly area: string
}): string {
  const items = input.lines
    .map((line) => `${Number(line.qty) || 1}× ${typeof line.name === 'string' ? line.name : '—'}`)
    .join(', ')
  return STORE_TEXT[input.language](input.number, items, input.area.trim() || '—')
}

/**
 * The buyer's emails (COMMERCE.md §10–§11): plain text with a simple HTML twin (`./render`). The
 * subject and opening are the owner's (`site-settings.shop.emails`, TASKS.md 27.3.d), passed in as
 * `wording` already filled (`./wording`); left out, each email sends its default — the wording in
 * `ORDER_EMAILS`, which is what these emails always said. The rest of each email — the figures,
 * the deadline and the links — is this file's own, in the buyer's language. The stores' emails are
 * `./store-templates`.
 */
import { ORDER_EMAILS } from '../../globals/site-settings/shop/notification-copy'
import type { OrderStatus } from '../../collections/orders/statuses'
import { render, rupiahOf, type Row } from './render'
import type { MailMessage } from './transport'
import { STATUS_EMAIL, wordingFor, type Lang, type Wording } from './wording'

export { storeNewOrderEmail, storeReassignedEmail } from './store-templates'
export type { StoreNewOrderEmailInput, StoreReassignedEmailInput } from './store-templates'

const GREETING: Record<Lang, string> = { en: 'Hello,', id: 'Halo,' }
const SIGN_OFF: Record<Lang, string> = { en: 'Old East Indies', id: 'Old East Indies' }
const TRACK_LINE: Record<Lang, string> = { en: 'Follow your order:', id: 'Pantau pesanan Anda:' }
const PAY_LINE: Record<Lang, string> = { en: 'Pay here:', id: 'Bayar di sini:' }
const DRIVER_LINE: Record<Lang, string> = {
  en: 'The driver’s details:',
  id: 'Data pengemudi:',
}

const ITEMS_LINE: Record<Lang, string> = { en: 'Items', id: 'Barang' }
const DELIVERY_LINE: Record<Lang, string> = { en: 'Delivery', id: 'Pengiriman' }
const FREE: Record<Lang, string> = { en: 'free', id: 'gratis' }
const TOTAL_LINE: Record<Lang, string> = { en: 'Total', id: 'Total' }
const PAY_BY_LINE: Record<Lang, (time: string) => string> = {
  en: (time) => `Please pay by ${time}.`,
  id: (time) => `Mohon bayar sebelum ${time}.`,
}

/** The default wording of `key` in `locale` for order `number` (no owner's text). */
const defaults = (key: keyof typeof ORDER_EMAILS, locale: Lang, number: number): Wording =>
  wordingFor({}, key, locale, { number })

export type BuyerStatusEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly orderNumber: number
  readonly status: OrderStatus
  readonly trackingUrl: string
  /** A short-lived presigned URL, only on `on_the_way` once a driver image is attached. */
  readonly driverImageUrl?: string | null
  /** The owner's subject and opening, filled; the default when left out. */
  readonly wording?: Wording
}

/** `null` when `status` has no buyer-facing status email (`pending_payment`: see `./index`). */
export function buyerStatusEmail(input: BuyerStatusEmailInput): MailMessage | null {
  const key = STATUS_EMAIL[input.status]
  if (key === undefined) return null
  const lang = input.locale
  const wording = input.wording ?? defaults(key, lang, input.orderNumber)
  const rows: Row[] = [
    GREETING[lang],
    '',
    wording.opening,
    '',
    { label: TRACK_LINE[lang], url: input.trackingUrl },
  ]
  if (input.driverImageUrl) rows.push('', { label: DRIVER_LINE[lang], url: input.driverImageUrl })
  rows.push('', SIGN_OFF[lang])
  return render(input.to, wording.subject, rows)
}

export type PricedOrderEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly orderNumber: number
  /** `totals.subtotal − totals.discount`: the items' own total, before delivery. */
  readonly itemsTotalIdr: number
  readonly deliveryFeeIdr: number
  readonly totalIdr: number
  /** `orders.expiresAt`, the end of the payment window; `null` shows no deadline sentence. */
  readonly payBy: string | null
  /** The buyer's order page (`/order/{token}`) — where they pay, never the tracking page. */
  readonly payUrl: string
  /** The owner's subject and opening, filled; the default when left out. */
  readonly wording?: Wording
}

export type QuoteReadyEmailInput = PricedOrderEmailInput

function pricedEmail(input: PricedOrderEmailInput, wording: Wording): MailMessage {
  const lang = input.locale
  const payByText =
    input.payBy === null
      ? null
      : new Date(input.payBy).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Makassar',
        })
  const fee = input.deliveryFeeIdr === 0 ? FREE[lang] : rupiahOf(input.deliveryFeeIdr)
  return render(input.to, wording.subject, [
    GREETING[lang],
    '',
    wording.opening,
    `${ITEMS_LINE[lang]}: ${rupiahOf(input.itemsTotalIdr)}`,
    `${DELIVERY_LINE[lang]}: ${fee}`,
    `${TOTAL_LINE[lang]}: ${rupiahOf(input.totalIdr)}`,
    ...(payByText === null ? [] : [PAY_BY_LINE[lang](payByText)]),
    '',
    { label: PAY_LINE[lang], url: input.payUrl },
    '',
    SIGN_OFF[lang],
  ])
}

/** "Your price is ready" (TASKS.md 6.6): staff quoted the fee; the buyer can now pay. */
export function quoteReadyEmail(input: QuoteReadyEmailInput): MailMessage {
  return pricedEmail(
    input,
    input.wording ?? defaults('priceReady', input.locale, input.orderNumber),
  )
}

/** "Ready to pay" (the plan's K2; TASKS.md 27.3): an order priced at checkout, just placed. */
export function orderReceivedEmail(input: PricedOrderEmailInput): MailMessage {
  return pricedEmail(
    input,
    input.wording ?? defaults('orderReceived', input.locale, input.orderNumber),
  )
}

export type ResendTrackingEmailInput = {
  readonly to: string
  readonly locale: Lang
  readonly trackingUrl: string
  /** The owner's subject and opening; the default when left out. */
  readonly wording?: Wording
}

/** "Find my order"'s email (TASKS.md 7.3.a): the link alone, not tied to any status. */
export function resendTrackingEmail(input: ResendTrackingEmailInput): MailMessage {
  const lang = input.locale
  const wording = input.wording ?? defaults('trackingLink', lang, 0)
  return render(input.to, wording.subject, [
    GREETING[lang],
    '',
    wording.opening,
    { label: '', url: input.trackingUrl },
    '',
    SIGN_OFF[lang],
  ])
}

/**
 * The order-created email (TASKS.md 6.5.b; COMMERCE.md §11): what was ordered, the amounts
 * **as stored on the order** (never re-priced), the pay-by time and the tracking link, sent
 * through `payload.sendEmail` in the buyer's language. Never thrown to its caller — a failed send
 * is logged without the token — and never wired into checkout here: 6.3a's action adds the one
 * call this file's header names, at merge.
 *
 * Reads the order through Payload's Local API (`overrideAccess: true` — the caller is the server's
 * own checkout step, not a visitor — `select` of only what the email shows), never SQL: these
 * fields carry no pin, no notes and no staff text, so a plain Local API read is the simple, safe
 * choice (unlike the order page's token-gated read, which has no access rule to lean on).
 */
import 'server-only'

import type { Payload } from '@engine/cms/instance'

import { baliTime } from '../../../../sites/shop/payment/bali-time'
import { emailText } from './copy'
import { formatRupiah } from '../../../../shared/ui/price/format-rupiah'
import { siteHref } from '../../../../shell/site'

export type SendOrderCreatedEmailInput = {
  readonly orderId: number
  /** Shown once, in the tracking link — never logged, never stored again here. */
  readonly trackingToken: string
  readonly locale: 'en' | 'id'
  /** The site's canonical origin, for the tracking link (`currentSite('shop').origin`). */
  readonly origin: string
}

export type SendOrderCreatedEmailResult = { readonly ok: boolean }

type OrderLineDoc = {
  name?: string | null
  variantLabel?: string | null
  qty?: number | null
  lineTotal?: number | null
}
type OrderDoc = {
  number?: number | null
  contact?: { name?: string | null; email?: string | null } | null
  expiresAt?: string | null
  totals?: {
    subtotal?: number | null
    discount?: number | null
    deliveryFee?: number | null
    total?: number | null
  } | null
  lines?: OrderLineDoc[] | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Sends it; `{ ok: false }` on any failure (a missing order, a transport error) — never throws. */
export async function sendOrderCreatedEmail(
  payload: Payload,
  input: SendOrderCreatedEmailInput,
): Promise<SendOrderCreatedEmailResult> {
  try {
    const order = (await payload.findByID({
      collection: 'orders',
      id: input.orderId,
      depth: 0,
      overrideAccess: true,
      select: { number: true, contact: true, expiresAt: true, totals: true, lines: true },
    })) as OrderDoc | null
    if (!order) {
      console.error(`[payment email] order ${input.orderId} not found`)
      return { ok: false }
    }
    const to = order.contact?.email
    if (!to) {
      console.error(`[payment email] order ${input.orderId} has no contact email`)
      return { ok: false }
    }

    const t = emailText(input.locale)
    const number = String(order.number ?? 0)
    const deadline = baliTime(new Date(order.expiresAt ?? Date.now()), input.locale)
    const trackingPath = siteHref('shop')('tracking', { token: input.trackingToken }, input.locale)
    const trackingLink = `${input.origin}${trackingPath}`
    const lines = order.lines ?? []

    const lineLine = (line: OrderLineDoc) => {
      const variant = line.variantLabel ? ` (${line.variantLabel})` : ''
      return `${line.qty ?? 0} × ${line.name ?? ''}${variant} — ${formatRupiah(line.lineTotal ?? 0)}`
    }

    const subject = t('email.subject', { number })
    const greeting = t('email.greeting', { name: order.contact?.name ?? '' })
    const body = t('email.body', { number })
    const discountIdr = order.totals?.discount ?? 0
    const amountLines = [
      t('email.subtotal', { amount: formatRupiah(order.totals?.subtotal ?? 0) }),
      ...(discountIdr > 0 ? [t('email.discount', { amount: formatRupiah(discountIdr) })] : []),
      t('email.delivery', { amount: formatRupiah(order.totals?.deliveryFee ?? 0) }),
      t('email.total', { total: formatRupiah(order.totals?.total ?? 0) }),
    ]
    const payByLine = t('email.payBy', { time: deadline })

    const text = [
      greeting,
      '',
      body,
      '',
      ...lines.map((line) => `  ${lineLine(line)}`),
      '',
      ...amountLines,
      payByLine,
      '',
      t('email.tracking', { link: trackingLink }),
    ].join('\n')

    const html = [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>${escapeHtml(body)}</p>`,
      '<ul>',
      ...lines.map((line) => `<li>${escapeHtml(lineLine(line))}</li>`),
      '</ul>',
      ...amountLines.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<p>${escapeHtml(payByLine)}</p>`,
      `<p><a href="${trackingLink}">${escapeHtml(t('email.trackingLinkText'))}</a></p>`,
    ].join('\n')

    await payload.sendEmail({ to, subject, text, html })
    return { ok: true }
  } catch (error) {
    console.error(
      `[payment email] order ${input.orderId} could not be sent: ${error instanceof Error ? error.message : String(error)}`,
    )
    return { ok: false }
  }
}

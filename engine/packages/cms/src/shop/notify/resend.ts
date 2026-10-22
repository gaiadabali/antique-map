/**
 * "Find my order" (TASKS.md 7.3.a; EXPERIENCE-SHOP.md §2 "Find my order"): an order number plus the
 * email or WhatsApp number the buyer typed at checkout, nothing else, resends the tracking link —
 * never confirms whether an order exists (SECURITY.md §2.10). `requestTrackingLink` therefore
 * always resolves with no result to read: whether it matched and sent an email is never visible to
 * the caller, so the page always shows the same words whatever happened here.
 *
 * A match decrypts the one token sealed at order creation (`trackingTokenEnc`, `../orders/link-key`)
 * — the link never rotates (TASKS.md 6.6, orchestrator decision A): this is a resend of the same
 * link, not a fresh one, exactly as every other notification now works.
 */
import type { Payload } from 'payload'

import { createHref, SITES, siteOrigin } from '@engine/config/sites'

import { normaliseEmail, normaliseWhatsApp } from '../orders/checkout-input'
import { openToken, orderLinkKeyFromEnv } from '../orders/link-key'
import { resendTrackingEmail } from './templates'
import { mailTransport } from './transport'

export type RequestTrackingLinkInput = {
  readonly orderNumber: unknown
  /** As typed; at least one of the two must normalise, or nothing is looked up. */
  readonly email: unknown
  readonly whatsapp: unknown
}

type OrderForResend = {
  readonly id: number
  readonly contact?: {
    email?: string | null
    whatsapp?: string | null
    locale?: string | null
  } | null
  readonly trackingTokenEnc?: string | null
}

/** Resends the tracking link if `orderNumber` and the contact match one order; silent otherwise. */
export async function requestTrackingLink(
  payload: Payload,
  input: RequestTrackingLinkInput,
): Promise<void> {
  const orderNumber =
    typeof input.orderNumber === 'number' && Number.isSafeInteger(input.orderNumber)
      ? input.orderNumber
      : null
  const email = normaliseEmail(input.email)
  const whatsapp = normaliseWhatsApp(input.whatsapp)
  if (orderNumber === null || orderNumber <= 0 || (email === null && whatsapp === null)) return

  let order: OrderForResend | undefined
  try {
    const result = await payload.find({
      collection: 'orders',
      overrideAccess: true,
      limit: 1,
      where: { number: { equals: orderNumber } },
      select: { contact: { email: true, whatsapp: true, locale: true }, trackingTokenEnc: true },
    })
    order = result.docs[0] as OrderForResend | undefined
  } catch {
    return
  }
  if (!order) return

  const matches =
    (email !== null && order.contact?.email?.toLowerCase() === email) ||
    (whatsapp !== null && order.contact?.whatsapp === whatsapp)
  if (!matches) return

  const buyerEmail = order.contact?.email
  if (!buyerEmail) return

  const locale: 'en' | 'id' = order.contact?.locale === 'id' ? 'id' : 'en'
  const token =
    typeof order.trackingTokenEnc === 'string' && order.trackingTokenEnc !== ''
      ? openToken(order.trackingTokenEnc, orderLinkKeyFromEnv())
      : null
  if (token === null) return

  const trackingUrl = `${siteOrigin('shop') ?? ''}${createHref(SITES.shop)('tracking', { token }, locale)}`
  try {
    await mailTransport().send(resendTrackingEmail({ to: buyerEmail, locale, trackingUrl }))
  } catch {
    // Best-effort, same as every other notification here.
  }
}

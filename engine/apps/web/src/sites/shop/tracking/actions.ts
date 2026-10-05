'use server'

/**
 * "Find my order"'s server action (TASKS.md 7.3.a; EXPERIENCE-SHOP.md §2): posts to
 * `requestTrackingLink` (`@engine/cms/shop/notify`) and always answers the same words, whether or
 * not anything matched — SECURITY.md §2.10's "never reveals whether an order exists". Rate-limited
 * per address with the same budget the token page's guesses share (`./rate-limit`): both are tries
 * against the same credential, a resent token.
 */
import { headers } from 'next/headers'

import { cms } from '@engine/cms/instance'
import { requestTrackingLink } from '@engine/cms/shop/notify'

import { clientAddress } from '../../../server/chat/identity'
import { trackingText } from './copy'
import { trackGuessAllowed } from './rate-limit'

export type FindOrderState = { readonly ok: boolean; readonly message: string }

const localeOf = (value: FormDataEntryValue | null): 'en' | 'id' => (value === 'id' ? 'id' : 'en')

export async function requestTrackingLinkAction(
  _prev: FindOrderState | null,
  formData: FormData,
): Promise<FindOrderState> {
  const locale = localeOf(formData.get('locale'))
  const text = trackingText(locale)

  const address = clientAddress(await headers())
  if (trackGuessAllowed(`find:${address ?? 'unknown'}`) > 0) {
    return { ok: false, message: text('tracking.find.rateLimited') }
  }

  const rawNumber = formData.get('orderNumber')
  const orderNumber =
    typeof rawNumber === 'string' && /^\d{1,15}$/.test(rawNumber.trim())
      ? Number(rawNumber.trim())
      : null
  const contact = typeof formData.get('contact') === 'string' ? (formData.get('contact') as string) : ''

  if (orderNumber !== null) {
    await requestTrackingLink(await cms(), {
      orderNumber,
      email: contact.includes('@') ? contact : null,
      whatsapp: contact.includes('@') ? null : contact,
    }).catch(() => {})
  }

  // Always the same answer: a match and a non-match must look identical to the caller.
  return { ok: true, message: text('tracking.find.sent') }
}

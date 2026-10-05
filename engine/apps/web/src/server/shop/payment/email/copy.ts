/**
 * The order-created email's words (6.5.b): the keys and neutral defaults here, the values in the
 * shop's lexicon files (`../../lexicon/{en,id}.json`, CONVENTIONS.md §6).
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'

import { SITE_COPY } from '../../../../shell/copy'

export const EMAIL_KEYS = defineMessages({
  'email.subject': 'Your order {number}',
  'email.greeting': 'Hi {name},',
  'email.body': "Thanks for your order {number}. Here's what you ordered:",
  'email.subtotal': 'Subtotal: {amount}',
  'email.discount': 'Discount: -{amount}',
  'email.delivery': 'Delivery: {amount}',
  'email.total': 'Total: {total}',
  'email.payBy': 'Please pay by {time}.',
  'email.tracking': 'Track your order any time: {link}',
  'email.trackingLinkText': 'Track your order',
})

export type EmailMessageKey = keyof typeof EMAIL_KEYS
export type EmailText = (key: EmailMessageKey, params?: Record<string, string | number>) => string

/** The order email's words for one locale. */
export function emailText(locale: 'en' | 'id'): EmailText {
  const messages: Messages<EmailMessageKey> = createMessages({
    defaults: EMAIL_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages)
}

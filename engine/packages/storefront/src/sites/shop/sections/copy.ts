/**
 * The words of the owner's feedback of 2026-11-19 (TASKS.md 28.2): the shop page's "Shop by", the
 * articles, the same-day promise, the newsletter pop-up, the contact strip and the home's stores.
 * The keys and neutral defaults are here, the values in the shop's lexicon
 * (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never holds a word. The owner's own
 * words (the promise, the pop-up's title and text) are site-settings', these the fallbacks.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const SECTIONS_KEYS = defineMessages({
  'shopBy.title': 'Shop',
  'shopBy.lede': 'Begin with a best seller, a theme or a kind of product.',
  'shopBy.bestSellers': 'Best sellers',
  'shopBy.themes': 'Shop by theme',
  'shopBy.productTypes': 'Shop by product type',
  'shopBy.wallDecor': 'Wall decor',
  'shopBy.seeAll': 'See all',
  'shopBy.seeAllOf': 'See all: {name}',
  'articles.title': 'Our latest articles',
  'articles.pageTitle': 'Articles',
  'articles.pageLede': 'Stories behind our maps and prints, each one a PDF to read or keep.',
  'articles.open': '{title} (PDF, opens in a new tab)',
  'articles.pdf': 'PDF',
  'articles.seeAll': 'See all articles',
  'articles.empty': 'No articles yet — please look again soon.',
  'promo.label': 'Delivery promise',
  'promo.today': 'Order by {time} today for delivery today.',
  'newsletter.email': 'Email',
  'newsletter.consent':
    'Yes, send me the Old East Indies newsletter. I can unsubscribe at any time.',
  'newsletter.submit': 'Subscribe',
  'newsletter.sending': 'Sending…',
  'newsletter.close': 'Close',
  'newsletter.success': 'Thank you — you are on the list.',
  'newsletter.privacy': 'Privacy notice',
  'contact.label': 'Contact us',
  'contact.whatsapp': 'WhatsApp {number}',
  'contact.whatsappLabel': 'WhatsApp {number} (opens in a new tab)',
  'contact.phoneLabel': 'Call {number}',
  'contact.emailLabel': 'Email {email}',
  'homeStores.title': 'Stores',
  'homeStores.lede': 'Find our prints in person, across Bali and Lombok.',
  'homeStores.flagship': 'Flagship store',
  'homeStores.seeAll': 'See all stores',
})

export type SectionsMessageKey = keyof typeof SECTIONS_KEYS

export type SectionsText = (
  key: SectionsMessageKey,
  params?: Record<string, string | number>,
) => string

export function sectionsText(locale: SiteLocale): SectionsText {
  const messages: Messages<SectionsMessageKey> = createMessages({
    defaults: SECTIONS_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages) as SectionsText
}

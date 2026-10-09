/**
 * The stores page's words (13.2): keys and neutral defaults here, values in the shop's lexicon
 * (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never holds a word.
 */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const STORES_KEYS = defineMessages({
  'stores.eyebrow': 'Where to buy',
  'stores.title': 'Our stores',
  'stores.description': 'The shops across Bali that stock Old East Indies.',
  'stores.lede.other': 'Old East Indies is stocked in {count} shops across Bali.',
  'stores.lede.one': 'Old East Indies is stocked in {count} shop in Bali.',
  'stores.areas': 'Areas',
  'stores.otherAreas': 'Other areas',
  'stores.count.other': '{count} stores',
  'stores.count.one': '{count} store',
  'stores.hours': 'Opening hours',
  'stores.map': 'Open in Maps',
  'stores.mapFor': 'Open {name} in Maps (opens in a new tab)',
  'stores.empty': 'No stores are listed yet — please check back soon.',
})

export type StoresMessageKey = keyof typeof STORES_KEYS
export type StoresText = (
  key: StoresMessageKey | PluralBase<StoresMessageKey>,
  params?: Record<string, string | number>,
) => string

export function storesText(locale: SiteLocale): StoresText {
  const messages: Messages<StoresMessageKey> = createMessages({
    defaults: STORES_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages) as StoresText
}

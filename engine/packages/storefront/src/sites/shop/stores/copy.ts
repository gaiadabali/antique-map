/**
 * The stores page's words (13.2): keys and neutral defaults here, values in the shop's lexicon
 * (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never holds a word.
 */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const STORES_KEYS = defineMessages({
  'stores.title': 'Our stores',
  'stores.lede.other': 'Old East Indies is stocked in {count} shops across Bali.',
  'stores.lede.one': 'Old East Indies is stocked in {count} shop in Bali.',
  'stores.areas': 'Areas',
  'stores.flagships': 'Flagship stores',
  'stores.region.lombok': 'Lombok',
  'stores.region.ubud': 'Ubud',
  'stores.region.amed': 'Amed',
  'stores.region.canggu': 'Canggu',
  'stores.nearby': 'Nearby',
  'stores.seeAllNearby': 'See all nearby stores ({count})',
  'stores.seeFewer': 'Show fewer stores',
  'stores.moreIn.other': '{count} more stores within a 30-minute drive',
  'stores.moreIn.one': '{count} more store within a 30-minute drive',
  'stores.nearbyArea': 'Other stores in {area}',
  'stores.nearbyEvery': 'Show every nearby store',
  'stores.nearbyLead': 'Stores nearest to you',
  'stores.nearbyLeadByArea': 'Every other store, by area',
  'stores.nearbyNote':
    'Your browser asks for your location first. Your location never leaves this device.',
  'stores.nearbyFinding': 'Finding where you are…',
  'stores.nearbySorted': 'Nearest first, from where you are now.',
  'stores.nearbyFailed': 'We could not get your location, so the stores are listed by area.',
  'stores.distance': '{distance} km away',
  'stores.distanceNear': 'Under 1 km away',
  // The owner's one address (2026-11-25), on every card: `server/shop/stores/owner-location`.
  'stores.address': 'Jl. Gambuh No.17, Pemecutan Kaja, Denpasar Utara, Denpasar, Bali 80231',
  'stores.count.other': '{count} stores',
  'stores.count.one': '{count} store',
  'stores.hours': 'Opening hours',
  'stores.map': 'Open in Maps',
  'stores.mapLabel': 'Open in Maps (opens in a new tab)',
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

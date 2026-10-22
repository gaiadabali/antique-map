/**
 * How the browse page names a facet value (5.1.b): the object type and the century chip in the
 * lexicon's words, the year pair as a span, a place by its published name. One place for the
 * facet panel and the applied chips, so a chip says what the facet said.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import { browseText, type BrowseKey } from './copy'

/** English counts centuries as ordinals (“18th”); Indonesian as “Abad ke-18”, the bare number. */
function centuryNumeral(century: number, locale: SiteLocale): string {
  if (locale !== 'en') return String(century)
  const tens = century % 100
  if (tens >= 11 && tens <= 13) return `${century}th`
  const suffix = ['th', 'st', 'nd', 'rd'][century % 10] ?? 'th'
  return `${century}${suffix}`
}

export function centuryLabel(century: number, locale: SiteLocale): string {
  return browseText(locale)('listing.century', { century: centuryNumeral(century, locale) })
}

export function objectTypeLabel(type: string, locale: SiteLocale): string {
  return browseText(locale)(`objectType.${type}` as BrowseKey)
}

/** The year pair as the chip says it: “1700–1800”, “1700–”, “–1800”. */
export function yearPairLabel(from: number | null, to: number | null): string {
  return `${from ?? ''}–${to ?? ''}`
}

export function placeLabel(places: readonly PlaceNode[], placeId: number): string {
  return places.find((place) => place.id === placeId)?.name ?? ''
}

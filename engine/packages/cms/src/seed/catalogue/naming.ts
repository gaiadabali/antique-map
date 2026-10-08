/**
 * A design's product name and shop category (task 10.6.e). The name is the design's title, then
 * the year as the shop writes it ("Bali Island Dutch Map, 1849" · "Map of Bali Island, c. 1600"):
 * an exact year bare, a circa year `c.` (Indonesian `sekitar`), a decade as written ("1930s",
 * Indonesian `1930-an`), none at all when the heading carries no year.
 */
import type { CategoryLabel, DesignDate } from './types'

export function yearText(date: DesignDate, language: 'en' | 'id'): string | null {
  if (date.precision === 'none' || date.year === null) return null
  if (date.precision === 'circa') {
    return language === 'en' ? `c. ${date.year}` : `sekitar ${date.year}`
  }
  if (date.precision === 'decade') {
    return language === 'en' ? (date.display ?? `${date.year}s`) : `${date.year}-an`
  }
  return String(date.year)
}

export function productName(title: string, date: DesignDate, language: 'en' | 'id'): string {
  const year = yearText(date, language)
  const base = title.trim()
  return year === null ? base : `${base}, ${year}`
}

export const CATEGORIES = {
  maps: { en: 'Maps', id: 'Peta' },
  travelPosters: { en: 'Travel posters', id: 'Poster perjalanan' },
  bali: { en: 'Bali', id: 'Bali' },
  animals: { en: 'Animals', id: 'Satwa' },
  botanicals: { en: 'Botanicals', id: 'Botani' },
  landscapes: { en: 'Landscapes', id: 'Lanskap' },
} as const satisfies Record<string, CategoryLabel>

/** A design in several catalogues takes the first that applies, in this order (owner brief). */
const PRIORITY: ReadonlyArray<readonly [string, CategoryLabel]> = [
  ['Maps', CATEGORIES.maps],
  ['Travel Posters', CATEGORIES.travelPosters],
  ['Animals', CATEGORIES.animals],
  ['Botanicals', CATEGORIES.botanicals],
  ['Landscapes', CATEGORIES.landscapes],
  ['Bali Island', CATEGORIES.bali],
]

export function categoryOf(catalogues: readonly string[]): CategoryLabel {
  for (const [catalogue, category] of PRIORITY) {
    if (catalogues.includes(catalogue)) return category
  }
  throw new Error(
    `A design names no catalogue this layer knows (${catalogues.join(', ') || 'none'}).`,
  )
}

/** The four Instagram-only designs' categories (owner brief): the posts carry no catalogue. */
export const INSTAGRAM_CATEGORIES: Readonly<Record<string, CategoryLabel>> = {
  'IG-Dcu3iFkgd_W': CATEGORIES.travelPosters,
  'IG-DcAZxt2gTTd': CATEGORIES.bali,
  'IG-DbqE0irAQLk': CATEGORIES.travelPosters,
  'IG-DbqEe-NAd9o': CATEGORIES.bali,
}

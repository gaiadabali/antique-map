/**
 * The gallery catalogue's view models (5.1.a): what the browse cards, the facet panel and the
 * search page render. **No price exists on a work and no price appears here** — the gallery sells
 * by enquiry (EXPERIENCE-GALLERY.md §4), so a card carries one status line, never an amount.
 *
 * Facet values use the contract's keys (`@engine/config/schema/facets`): `objectType`, `place`,
 * `maker`, `date`, `subject`, `availability` — the same keys the route map and the beacon's
 * `facets[]` prop spell, never a second vocabulary.
 */
import type { WorkSort } from './state'

/** One maker credit as a card renders it: the name, its certainty, never implied certain. */
export type CardMaker = {
  readonly name: string
  readonly certainty: string
}

/** One place credit as a card shows it: the record's own name (localized) with its role. */
export type CardPlace = {
  readonly name: string
  readonly role: string
  readonly primary: boolean
}

/** A card's lead image, as `media` exposes it to the public. */
export type CardImage = {
  readonly url: string
  readonly alt: string
  readonly width: number | null
  readonly height: number | null
}

/** One browse card (EXPERIENCE-GALLERY.md §4): title, maker and date with their precision,
 * dimensions, and one status line. The item link is `href()` of the item surface, built by the
 * page from `publicId` and the slug — never by this loader. */
export type WorkCardVM = {
  readonly id: number
  readonly title: string
  readonly maker: CardMaker | null
  readonly place: CardPlace | null
  readonly objectType: string | null
  /** The date as written (`date.display`, localized) or the reading's own words. */
  readonly date: string | null
  /** Sheet dimensions as the card shows them, in cm and inches; `null` when none is measured. */
  readonly dimensions: string | null
  readonly status: 'available' | 'on-hold' | 'sold'
  readonly image: CardImage | null
  readonly publicId: number
  readonly workUid: string | null
  readonly stockNumber: string | null
}

/** One page of the browse listing. */
export type WorkListingVM = {
  readonly items: readonly WorkCardVM[]
  readonly page: number
  readonly pages: number
  readonly total: number
  readonly sort: WorkSort
}

/** One facet option with its count — a count that applies every filter but its own. */
export type FacetOptionVM = {
  readonly value: string
  readonly label: string
  readonly count: number
  /** Whether the option is among the listing's current filters. */
  readonly applied: boolean
}

/** One branch of the place facet: a place and the children a visitor can narrow to. */
export type PlaceFacetVM = {
  readonly value: string
  readonly label: string
  /** Rolled-up count: this place and everything within it. */
  readonly count: number
  readonly applied: boolean
  readonly children: readonly PlaceFacetVM[]
}

/** A facet's own view model: its options (or branches), always shown, zero included. */
export type FacetVM = {
  readonly key: 'availability' | 'objectType' | 'maker' | 'place' | 'date' | 'subject'
  readonly options: readonly FacetOptionVM[]
  readonly places: readonly PlaceFacetVM[]
  /** The period's from–to pair, when the facet is `date`. */
  readonly range: { readonly from: number | null; readonly to: number | null }
}

/** The six facets the browse page shows, in the order it shows them. */
export type FacetSetVM = readonly FacetVM[]

/** The one "Did you mean" candidate pg_trgm found, or `null`. */
export type SearchSuggestion = {
  readonly kind: 'maker' | 'place' | 'subject'
  readonly label: string
  /** The historical name beside the modern one, when the candidate is a place's ("Celebes"). */
  readonly historical?: string
}

/** One search answer (5.1.c): the cards, the count, the suggestion, the stock-number jump. */
export type SearchResultVM = {
  readonly items: readonly WorkCardVM[]
  readonly total: number
  readonly suggestion: SearchSuggestion | null
  /** A query that names a stock number (`M.0500`) jumps to that item. */
  readonly jumpTo: {
    readonly publicId: number
    readonly workUid: string | null
    readonly title: string
  } | null
}

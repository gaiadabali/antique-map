/**
 * @contract C2 — view models: browse, search and directories · owner: ARC · consumers: WEB, UXG, UXE, SRC
 *
 * Browse and search are resolved per request (their prices and price facets follow the
 * ship-to market, their availability is computed at query time), so they carry no
 * `Streamed` parts. Every href — a facet option, a chip's removal, a sort, a page — is
 * built with C10's `href()` from the listing's own `ListingQuery`, so a canonical URL is
 * just `href()` of the state. Counts follow the all-but-this-facet rule.
 */
import type { CurrencyCode, FacetKey, SortKey } from '@engine/config/schema'
import type { ListingQuery } from '@engine/config/routes'

import type { BlockVM } from '../blocks'
import type { CardVM } from '../cards'
import type { ImageVM, LinkVM, MessageVM, SeoVM } from '../common'

export type FacetOptionVM = {
  value: string
  label: string
  count: number
  selected: boolean
  href: string
  /** The place tree, rolled up: a drill-down on a phone, never a 100-link list. */
  children: readonly FacetOptionVM[]
}

export type FacetVM =
  | { kind: 'options'; key: FacetKey; options: readonly FacetOptionVM[]; multiple: boolean }
  /** Date (years), size (mm) or price (minor units of `currency` — the market's alone). */
  | {
      kind: 'range'
      key: FacetKey
      unit: 'year' | 'mm' | 'minor'
      currency: CurrencyCode | null
      bounds: { min: number; max: number }
      selected: { min: number | null; max: number | null }
      /** "< Rp 5 juta" · "VOC era 1602–1799" — per market, from brand config. */
      presets: readonly { label: string; href: string; selected: boolean }[]
      /** Price only: "include price on request". */
      includeOnRequest: { selected: boolean; href: string } | null
    }
  | { kind: 'toggle'; key: FacetKey; selected: boolean; count: number; href: string }

export type PaginationVM = {
  page: number
  pages: number
  previous: string | null
  next: string | null
}

/** Zero results never dead-end (EXPERIENCE-GALLERY.md §4). */
export type EmptyResultsVM = {
  /** "Celebes → Sulawesi", spelling and historical-name suggestions. */
  suggestions: readonly LinkVM[]
  /** An enquiry prefilled with the query. */
  enquiry: string
  /** A want-list alert for this query (C10 `wantList`); `null` when `retention.emailWantList` is off. */
  alert: { href: string } | null
  /** "We hold about 9,500 works and not all are online — ask us." */
  message: MessageVM
}

type ListingBase = {
  title: string
  query: ListingQuery
  results: readonly CardVM[]
  total: number
  facets: readonly FacetVM[]
  /** Applied-filter chips, each with the href that removes it. */
  applied: readonly LinkVM[]
  clearAll: string | null
  sort: readonly { key: SortKey; href: string; selected: boolean }[]
  pagination: PaginationVM
  empty: EmptyResultsVM | null
  /**
   * "Alert me about new maps of Bali under US$2,000": the want-list page for this listing (C10
   * `wantList`, `watch` its canonical path); `null` when `retention.emailWantList` is off.
   */
  alert: { href: string } | null
  seo: SeoVM
  breadcrumbs: readonly LinkVM[]
}

export type ListingVM = ListingBase & {
  surface: 'browse'
  /** The visible Available · On hold · Sold toggle — the sold archive is a feature. */
  status: readonly { key: 'available' | 'onHold' | 'sold'; href: string; selected: boolean }[]
  /** Landing copy for a named facet URL (`/antique-maps/java`); `null` on plain browse. */
  intro: readonly BlockVM[] | null
}

export type SearchVM = ListingBase & {
  surface: 'search'
  /** Works with JavaScript off: a plain GET form carrying `q`. */
  q: string
  /** Historical and modern names the query was expanded with ("Batavia" ⇄ "Jakarta"). */
  expandedWith: readonly string[]
}

/** The index pages behind a surface's bare segment: makers A–Z, the place tree, the journal… */
export type DirectorySurface =
  | 'maker'
  | 'place'
  | 'collection'
  | 'source'
  | 'exhibition'
  | 'location'
  | 'story'
  | 'catalogue'
  | 'newsletterArchive'

export type DirectoryEntryVM = {
  title: string
  href: string
  image: ImageVM | null
  /** Life dates, "18 available", "12–15 March": codes and values the app words and formats. */
  meta: readonly MessageVM[]
  children: readonly DirectoryEntryVM[]
}

export type DirectoryVM = {
  surface: DirectorySurface
  directory: true
  title: string
  intro: readonly BlockVM[] | null
  /** Letters, island groups, years or upcoming/past — `title: null` for one flat group. */
  groups: readonly { title: string | null; entries: readonly DirectoryEntryVM[] }[]
  pagination: PaginationVM | null
  seo: SeoVM
  breadcrumbs: readonly LinkVM[]
}

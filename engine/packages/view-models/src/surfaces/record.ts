/**
 * View models: a work's record — its collation, a book's parts and its condition. Public fields
 * only: a work's `physical` group, acquisition cost and consignor never reach a view model
 * (ARCHITECTURE.md §12). The item page that shows them is built later, from these.
 */
import type { Colouring, DimensionsVM, FuzzyDateVM, ImageVM, ObjectType } from '../common'

/**
 * The collation block collectors expect (EXPERIENCE-GALLERY.md §5, the Sanderus model). Its
 * controlled lists arrive as keys the app labels from its lexicon — `objectType.<key>`,
 * `technique.<key>`, `colour.<key>` (v1.5, `TermVM`'s rule in `../common`).
 */
export type RecordVM = {
  objectType: ObjectType
  publication: {
    place: string | null
    publisher: string | null
    /** "From: Oud en Nieuw Oost-Indiën, 1724–26". */
    sourceWork: string | null
    edition: string | null
    state: string | null
    /** The language of the printed text: its name for the page, and its BCP-47 tag. */
    textLanguage: { label: string; lang: string } | null
    /** "Verso: blank". */
    verso: string | null
  }
  firstEdition: FuzzyDateVM | null
  dateOnPlate: FuzzyDateVM | null
  /** The controlled select's key; its list joins C1 with the works schema (TASKS.md 8.2). */
  technique: string | null
  colour: Colouring | null
  /** mm; the formatter adds inches. */
  dimensions: DimensionsVM
}

/** Books are not flat sheets: a volume's collation (DESIGN-SYSTEM.md §3). */
export type BookPartVM = {
  binding: string | null
  pagination: string | null
  plates: string | null
  completeness: string | null
  /** Spreads, in order. */
  openings: readonly ImageVM[]
  spine: ImageVM | null
  cover: ImageVM | null
}

/** The grade is a term of the brand's published scale, linked to its legend. */
export type ConditionVM = {
  grade: { label: string; definition: string; equivalent: string | null; scaleHref: string }
  notes: string | null
  defects: readonly string[]
  restoration: string | null
}

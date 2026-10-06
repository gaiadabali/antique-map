/** The place page's view models (5.4.a; EXPERIENCE-GALLERY.md §7). */
import type { WorkCardVM } from '../catalogue/view-models'

export type HistoricalNameVM = {
  readonly name: string
  readonly language: string | null
  readonly period: string | null
}

export type PlaceChildVM = {
  readonly slug: string
  /** The full gazetteer path to the child, outermost first — the place page's own link. */
  readonly path: readonly string[]
  readonly name: string
}

export type PlaceVM = {
  readonly id: number
  readonly name: string
  readonly path: readonly string[]
  readonly historicalNames: readonly HistoricalNameVM[]
  readonly type: string | null
  readonly children: readonly PlaceChildVM[]
  readonly available: readonly WorkCardVM[]
  readonly sold: readonly WorkCardVM[]
}

/** One top-level branch of the places index: an island group or "Beyond Indonesia", never a flat
 * 100-link list (EXPERIENCE-GALLERY.md §2). */
export type PlaceIndexNodeVM = {
  readonly slug: string
  readonly path: readonly string[]
  readonly name: string
  readonly childCount: number
}

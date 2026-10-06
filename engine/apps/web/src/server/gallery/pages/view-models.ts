/** The editorial and information page's view model (5.4.b; EXPERIENCE-GALLERY.md §7). */
import type { CardImage, WorkCardVM } from '../catalogue/view-models'

export type PageVM = {
  readonly title: string
  readonly intro: string | null
  readonly hero: CardImage | null
  /** The body's paragraphs, split on blank lines (CONTENT-MODEL.md §6: plain text for now — rich
   * text blocks land with TASKS.md 9.3). */
  readonly body: readonly string[]
  /** A curated collection page's works, through the card projection. */
  readonly works: readonly WorkCardVM[]
  readonly seoTitle: string | null
  readonly seoDescription: string | null
}

/**
 * The deterministic alt-text baseline (CONTENT-MODEL.md §6; TASKS.md 8.3.f): built from the record,
 * not by AI, so an image can publish the day it is catalogued — "Engraved map of Bali by François
 * Valentijn, 1726, hand-coloured, recto" — and a cataloguer improves it later. Without it the
 * migration's 2,090 items could not publish.
 *
 * **A synthetic image's baseline starts with its label** (C9 `SYNTHETIC_LABEL`): "Digital mockup"
 * or "AI-generated image", in the brand's lexicon's words for the locale (`image.synthetic.<label>`,
 * TASKS.md 6.3), which the caller passes — the CMS holds no lexicon. Built twice, it never labels
 * twice. The description — what the record says the image shows — is the caller's (8.2's work
 * fields; a product's in 9.1).
 */
import { SYNTHETIC_LABEL, type MediaProvenance, type SyntheticLabel } from '@engine/media/contract'

export type AltBaselineInput = {
  /** What the image shows, from its record: "Engraved map of Bali by François Valentijn, 1726…". */
  readonly description: string
  readonly provenance: MediaProvenance
  /** The lexicon's words for a label in the locale being written ("Digital mockup"). */
  readonly labelWords: (label: SyntheticLabel) => string
}

/** Whether `alt` already opens with the label's words, ignoring case. */
export function opensWithLabel(alt: string, words: string): boolean {
  return alt.trim().toLocaleLowerCase().startsWith(words.trim().toLocaleLowerCase())
}

export function altBaseline(input: AltBaselineInput): string {
  const description = input.description.trim()
  if (description.length === 0) throw new Error('an alt baseline needs a description')
  const label = SYNTHETIC_LABEL[input.provenance]
  if (label === null) return description
  const words = input.labelWords(label).trim()
  if (words.length === 0) throw new Error(`no words for the label "${label}"`)
  return opensWithLabel(description, words) ? description : `${words}: ${description}`
}

/**
 * The deterministic alt-text baseline (CONTENT-MODEL.md §6; TASKS.md 8.3.f, 8.3.i): built from the
 * record, not by AI, so an image can publish the day it is catalogued — "Engraved map of Bali by
 * François Valentijn, 1726, hand-coloured, recto" — and a cataloguer improves it later. Without it
 * the migration's 2,090 items could not publish.
 *
 * **The baseline is the description and nothing else** (C9 v1.6). A synthetic image's label —
 * "Digital mockup", "AI-generated image" — is added where the image is rendered, from its
 * provenance (`renderedAlt()`, lexicon `image.syntheticAlt.<label>`), and never stored in `alt`, so
 * no edit of the alt can remove it. The description — what the record says the image shows — is
 * the caller's (8.2's work fields; a product's in 9.1).
 *
 * An alt written elsewhere — the old site's, or a baseline from before v1.6 — may already open with
 * a label's words; `withoutLabel()` takes them off before it is stored, so the stored alt describes
 * the image and the rendered one is labelled once. The words are the caller's: the CMS holds no
 * lexicon (each site's `sites/<site>/lexicon` in the app, `image.synthetic.<label>`).
 */
import { opensWithLabel } from '@engine/media/contract'

export type AltBaselineInput = {
  /** What the image shows, from its record: "Engraved map of Bali by François Valentijn, 1726…". */
  readonly description: string
}

export function altBaseline(input: AltBaselineInput): string {
  const description = input.description.trim()
  if (description.length === 0) throw new Error('an alt baseline needs a description')
  return description
}

/** What may stand between a label's words and the description: "Digital mockup: …", "… – …". */
const AFTER_LABEL = /^[\s:;,.\-–—]*/
const WORD_CHARACTER = /[\p{L}\p{N}]/u

/**
 * `alt` with an opening label taken off — the first of `labels` (the lexicon's words for each
 * synthetic label, in the alt's locale) it opens with as whole words, ignoring case, and the
 * punctuation after it — or `alt` as it is, trimmed, when it opens with none: "Digital mockups of
 * the series" keeps its words. Blank words never match (`opensWithLabel`). An alt that is nothing
 * but a label is refused: it describes nothing.
 */
export function withoutLabel(alt: string, labels: readonly string[]): string {
  const text = alt.trim()
  const words = labels.find(
    (label) =>
      opensWithLabel(text, label) && !WORD_CHARACTER.test(text.charAt(label.trim().length)),
  )
  if (words === undefined) return text
  const rest = text.slice(words.trim().length).replace(AFTER_LABEL, '').trim()
  if (rest.length === 0) throw new Error(`the alt "${text}" is a label and no description`)
  return rest
}

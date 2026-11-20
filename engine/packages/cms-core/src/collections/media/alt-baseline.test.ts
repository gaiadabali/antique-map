/**
 * The alt baseline (TASKS.md 8.3.f, 8.3.i): the description only — a synthetic image's label is
 * added at render from its provenance (C9 v1.6 `renderedAlt()`, TASKS.md 8.4.b), never stored, which
 * supersedes 8.3.f's "a synthetic image's alt baseline starts with its label".
 */
import {
  MEDIA_PROVENANCES,
  renderedAlt,
  SYNTHETIC_LABEL,
  type MediaProvenance,
  type SyntheticLabelWords,
} from '@engine/media/contract'
import { describe, expect, it } from 'vitest'

import { altBaseline, withoutLabel } from './alt-baseline'

// The lexicon's shape (`image.synthetic.<label>`, `image.syntheticAlt.<label>`), in English.
const LABEL = { 'digital-mockup': 'Digital mockup', 'ai-generated': 'AI-generated image' }
const words: SyntheticLabelWords = {
  label: (label) => LABEL[label],
  labelled: (label, alt) => `${LABEL[label]}: ${alt}`,
}
const LABELS = Object.values(LABEL)
const shown = (alt: string, provenance: MediaProvenance) =>
  renderedAlt(alt, SYNTHETIC_LABEL[provenance], words)

describe('the alt baseline', () => {
  it('is the description, whatever the provenance: no label is ever stored in alt', () => {
    const description = 'Engraved map of Bali by François Valentijn, 1726, hand-coloured, recto'
    expect(altBaseline({ description: `  ${description} ` })).toBe(description)
    for (const label of LABELS) {
      expect(altBaseline({ description: 'A framed print above a sofa' })).not.toContain(label)
    }
    expect(() => altBaseline({ description: ' ' })).toThrow(/needs a description/)
  })

  it("is labelled where it is rendered, from the image's provenance, and once", () => {
    const stored = altBaseline({ description: 'A framed print above a sofa' })
    expect(shown(stored, 'photograph')).toBe('A framed print above a sofa')
    expect(shown(stored, 'composite')).toBe('Digital mockup: A framed print above a sofa')
    expect(shown(stored, 'rendered')).toBe('Digital mockup: A framed print above a sofa')
    expect(shown(stored, 'ai-generated')).toBe('AI-generated image: A framed print above a sofa')
    for (const provenance of MEDIA_PROVENANCES) {
      const rendered = shown(stored, provenance)
      expect(LABELS.filter((label) => rendered.includes(label)).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('withoutLabel(): an alt written before v1.6, or on the old site', () => {
  it('takes an opening label off, with the punctuation after it, so the label shows once', () => {
    expect(withoutLabel('Digital mockup: A room', LABELS)).toBe('A room')
    expect(withoutLabel('  ai-generated image — a street at dusk ', LABELS)).toBe(
      'a street at dusk',
    )
    const stored = withoutLabel('AI-generated image: A street', LABELS)
    expect(shown(stored, 'ai-generated')).toBe('AI-generated image: A street')
  })

  it('leaves an alt that opens with no label, or with its words inside a longer word', () => {
    expect(withoutLabel(' Engraved map of Bali, 1726', LABELS)).toBe('Engraved map of Bali, 1726')
    expect(withoutLabel('A digital mockup of a room', LABELS)).toBe('A digital mockup of a room')
    expect(withoutLabel('Digital mockups of the series', LABELS)).toBe(
      'Digital mockups of the series',
    )
  })

  it('never matches blank words, and refuses an alt that is only a label', () => {
    expect(withoutLabel('Digital mockup: A room', ['', '  '])).toBe('Digital mockup: A room')
    expect(() => withoutLabel('Digital mockup:', LABELS)).toThrow(/a label and no description/)
  })
})

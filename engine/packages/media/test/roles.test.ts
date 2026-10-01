/**
 * C9's image roles and provenance (v1.4, TASKS.md 6.2.e): a product and a location get roles of
 * their own, `media.role` a value list that never holds `primary`, and the honesty rules of
 * docs/design/imagery/retouching-and-labelling.md §5 become answers a publish guard can read.
 * v1.6: a synthetic image's label is added where it renders, from its provenance — never stored.
 */
import { describe, expect, it } from 'vitest'

import {
  CONDITION_ROLES,
  IMAGE_ROLES,
  IMAGE_SUBJECTS,
  isSynthetic,
  LOCATION_IMAGE_ROLES,
  MEDIA_PROVENANCES,
  MEDIA_ROLES,
  opensWithLabel,
  orderImages,
  PRODUCT_IMAGE_ROLES,
  primaryImageIndex,
  provenanceAllowed,
  renderedAlt,
  roleAllowed,
  ROLES_BY_SUBJECT,
  SYNTHETIC_LABEL,
  WORK_IMAGE_ROLES,
  type MediaProvenance,
  type MediaRole,
  type RoledImage,
  type SyntheticLabelWords,
} from '../src/contract'

const photo = (role: MediaRole): RoledImage => ({ role, provenance: 'photograph' })
const made = (role: MediaRole, provenance: MediaProvenance): RoledImage => ({ role, provenance })

describe('the role lists', () => {
  it('keeps v1.1’s roles, in v1.1’s order, first — v1.4 only appends', () => {
    expect(IMAGE_ROLES.slice(0, 9)).toEqual([
      'primary',
      'recto',
      'verso',
      'detail',
      'raking',
      'transmitted',
      'framed',
      'in-room',
      'scale',
    ])
  })

  it('gives a product the seven roles of the imagery brief, and a location the showroom', () => {
    expect([...PRODUCT_IMAGE_ROLES].sort()).toEqual(
      ['detail', 'flat', 'in-room', 'lifestyle', 'packaging', 'scale', 'showroom'].sort(),
    )
    expect(LOCATION_IMAGE_ROLES).toEqual(['showroom'])
  })

  it('lets every role a page labels be an ImageRole, and no media record be the primary', () => {
    for (const role of [...WORK_IMAGE_ROLES, ...PRODUCT_IMAGE_ROLES, ...LOCATION_IMAGE_ROLES]) {
      expect(IMAGE_ROLES).toContain(role)
    }
    expect(MEDIA_ROLES).not.toContain('primary')
    expect(new Set(MEDIA_ROLES).size).toBe(MEDIA_ROLES.length)
  })

  it('makes media.role exactly the union of what each subject takes', () => {
    const union = new Set(IMAGE_SUBJECTS.flatMap((subject) => [...ROLES_BY_SUBJECT[subject]]))
    expect([...union].sort()).toEqual([...MEDIA_ROLES].sort())
    expect(CONDITION_ROLES.every((role) => roleAllowed('work', role))).toBe(true)
    expect(roleAllowed('work', 'flat')).toBe(false)
    expect(roleAllowed('location', 'in-room')).toBe(false)
    expect(roleAllowed('other', 'room-plate')).toBe(true)
  })
})

describe('provenance', () => {
  it('has four values, the last KOI’s aiGenerated, and labels every synthetic one', () => {
    expect(MEDIA_PROVENANCES).toEqual(['photograph', 'composite', 'rendered', 'ai-generated'])
    for (const provenance of MEDIA_PROVENANCES) {
      expect(SYNTHETIC_LABEL[provenance] === null).toBe(!isSynthetic(provenance))
    }
    expect(SYNTHETIC_LABEL['ai-generated']).toBe('ai-generated')
    expect(SYNTHETIC_LABEL.rendered).toBe('digital-mockup')
  })

  it('always allows a photograph', () => {
    for (const subject of IMAGE_SUBJECTS) {
      for (const role of ROLES_BY_SUBJECT[subject]) {
        expect(provenanceAllowed(subject, role, 'photograph')).toBe(true)
      }
    }
  })

  it('lets a work be synthetic only in a room, and never AI-made', () => {
    for (const role of WORK_IMAGE_ROLES) {
      expect(provenanceAllowed('work', role, 'composite')).toBe(role === 'in-room')
      expect(provenanceAllowed('work', role, 'ai-generated')).toBe(false)
    }
    expect(provenanceAllowed('work', 'in-room', 'rendered')).toBe(true)
  })

  it('keeps a location real, lets a product be labelled, and a plate only rendered', () => {
    expect(provenanceAllowed('location', 'showroom', 'rendered')).toBe(false)
    expect(provenanceAllowed('product', 'flat', 'ai-generated')).toBe(true)
    expect(provenanceAllowed('other', 'room-plate', 'rendered')).toBe(true)
    expect(provenanceAllowed('other', 'room-plate', 'composite')).toBe(false)
    expect(provenanceAllowed('other', 'room-plate', 'ai-generated')).toBe(false)
    expect(provenanceAllowed('other', 'editorial', 'ai-generated')).toBe(true)
  })
})

describe('renderedAlt() — the label is added at render, never stored (v1.6)', () => {
  // The lexicon's shape (`image.synthetic.<label>`, `image.syntheticAlt.<label>`), in English.
  const LABEL = { 'digital-mockup': 'Digital mockup', 'ai-generated': 'AI-generated image' }
  const words: SyntheticLabelWords = {
    label: (label) => LABEL[label],
    labelled: (label, alt) => `${LABEL[label]}: ${alt}`,
  }
  const shown = (alt: string, provenance: MediaProvenance) =>
    renderedAlt(alt, SYNTHETIC_LABEL[provenance], words)

  it('shows a photograph’s alt as stored', () => {
    expect(shown('Engraved map of Bali, 1726, recto', 'photograph')).toBe(
      'Engraved map of Bali, 1726, recto',
    )
  })

  it('labels every synthetic image from its provenance, whatever its alt says', () => {
    expect(shown('The Bali map framed on a sofa wall', 'composite')).toBe(
      'Digital mockup: The Bali map framed on a sofa wall',
    )
    expect(shown('A reading room', 'rendered')).toBe('Digital mockup: A reading room')
    expect(shown('A reading room', 'ai-generated')).toBe('AI-generated image: A reading room')
  })

  it('never labels twice: an alt that already opens with the words is shown as it is', () => {
    expect(shown('digital mockup: the Bali map framed', 'composite')).toBe(
      'digital mockup: the Bali map framed',
    )
    expect(opensWithLabel('  AI-generated image of a room', 'AI-generated image ')).toBe(true)
    expect(opensWithLabel('A digital mockup of a room', 'Digital mockup')).toBe(false)
  })

  it('never drops a label for want of words', () => {
    expect(opensWithLabel('anything at all', '   ')).toBe(false)
    const blank: SyntheticLabelWords = { ...words, label: () => '' }
    expect(renderedAlt('A sofa wall', 'digital-mockup', blank)).toBe('Digital mockup: A sofa wall')
  })
})

describe('primaryImageIndex()', () => {
  it('leads a work with its first photographed recto, wherever it sits', () => {
    expect(primaryImageIndex('work', [photo('verso'), photo('detail'), photo('recto')])).toBe(2)
    expect(
      primaryImageIndex('work', [made('recto', 'composite'), photo('verso'), photo('recto')]),
    ).toBe(2)
  })

  it('gives a work with no photographed recto no primary — never a detail or a mockup', () => {
    expect(primaryImageIndex('work', [photo('detail'), made('in-room', 'rendered')])).toBe(-1)
    expect(primaryImageIndex('work', [made('recto', 'ai-generated')])).toBe(-1)
    expect(primaryImageIndex('work', [])).toBe(-1)
  })

  it('leads a product with a real room or flat shot once one exists, a labelled mockup until then', () => {
    expect(primaryImageIndex('product', [photo('flat'), made('in-room', 'composite')])).toBe(0)
    expect(primaryImageIndex('product', [photo('lifestyle'), made('in-room', 'rendered')])).toBe(1)
    expect(primaryImageIndex('product', [photo('detail'), photo('in-room'), photo('flat')])).toBe(1)
    expect(primaryImageIndex('product', [photo('packaging'), photo('lifestyle')])).toBe(1)
    expect(primaryImageIndex('product', [])).toBe(-1)
  })
})

describe('orderImages()', () => {
  it('orders by the subject’s roles, photographs first within a role, then as given', () => {
    const images = [
      { ...photo('detail'), id: 'd1' },
      { ...made('in-room', 'composite'), id: 'mockup' },
      { ...photo('flat'), id: 'f1' },
      { ...photo('in-room'), id: 'room' },
      { ...photo('detail'), id: 'd2' },
    ]
    expect(orderImages('product', images).map((image) => image.id)).toEqual([
      'room',
      'mockup',
      'f1',
      'd1',
      'd2',
    ])
    expect(images[0]?.id).toBe('d1')
  })

  it('puts a role the subject does not take last, for its guard to name', () => {
    const ordered = orderImages('work', [photo('flat'), photo('verso'), photo('recto')])
    expect(ordered.map((image) => image.role)).toEqual(['recto', 'verso', 'flat'])
  })
})

/**
 * The publish guard and the image rules, pure (TASKS.md 8.2.c, 8.2.f): every missing requirement
 * listed at once, in plain words; a blank location or export status never among them.
 */
import { WORK_IMAGE_ROLES } from '@engine/media/contract'
import { describe, expect, it } from 'vitest'

import {
  imagePublishProblems,
  imageRowErrors,
  primaryImageRow,
  type ImageFacts,
} from './work-images'
import { publishProblems, type PublishFacts } from './work-publish'

const image = (over: Partial<ImageFacts> = {}): ImageFacts => ({
  id: '1',
  role: 'recto',
  provenance: 'photograph',
  alt: 'Engraved map of Bali by François Valentijn, 1726, hand-coloured, recto',
  altSource: 'cataloguer',
  masterVerdict: 'pass',
  ...over,
})

/** An issue whose message matches `pattern`, with a comma-free summary for the admin's toast. */
const issue = (pattern: RegExp) =>
  expect.objectContaining({
    message: expect.stringMatching(pattern),
    summary: expect.stringMatching(/^[^,]+$/),
  })

const complete: PublishFacts = {
  title: 'Bali by François Valentijn, 1726',
  objectType: 'map',
  date: { precision: 'circa' },
  hasMaker: true,
  hasPlaces: true,
  hasPrimaryPlace: true,
  images: [image(), image({ id: '2', role: 'verso' })],
  isCopy: false,
  hasGrade: true,
  aiDraft: [],
}

describe('the image rules on every save (C9 roleAllowed, provenanceAllowed)', () => {
  it('lets a work show each of its roles as a photograph', () => {
    const rows = WORK_IMAGE_ROLES.map((role) => image({ role }))
    expect(imageRowErrors(rows)).toEqual(rows.map(() => null))
  })

  it('refuses a product’s or a page’s role on a work', () => {
    expect(imageRowErrors([image({ role: 'flat' }), image({ role: 'editorial' })])).toEqual([
      issue(/belongs to a product or a page/),
      issue(/belongs to a product or a page/),
    ])
  })

  it('allows a labelled mockup only as an in-room view, and nothing AI-generated at all', () => {
    expect(
      imageRowErrors([
        image({ role: 'in-room', provenance: 'composite' }),
        image({ role: 'in-room', provenance: 'rendered' }),
        image({ role: 'in-room', provenance: 'ai-generated' }),
        image({ role: 'recto', provenance: 'composite' }),
        image({ role: 'detail', provenance: 'ai-generated' }),
      ]),
    ).toEqual([
      null,
      null,
      issue(/Nothing on a work is AI-generated/),
      issue(/Only a view in a room may be a mockup/),
      issue(/Nothing on a work is AI-generated/),
    ])
  })

  it('asks for a role and a provenance on an image without them, and ignores an empty row', () => {
    expect(imageRowErrors([image({ role: null }), image({ id: null })])).toEqual([
      issue(/no role or provenance/),
      null,
    ])
  })
})

describe('the primary image (C9 primaryImageIndex): the first photographed recto', () => {
  it('is the first photographed recto, whatever comes before it', () => {
    expect(
      primaryImageRow([
        image({ role: 'verso' }),
        image({ role: 'in-room', provenance: 'composite' }),
        image({ role: 'recto' }),
        image({ role: 'recto' }),
      ]),
    ).toBe(2)
  })

  it('is never a detail, a verso or a synthetic image', () => {
    expect(primaryImageRow([image({ role: 'detail' }), image({ role: 'verso' })])).toBe(-1)
    expect(primaryImageRow([image({ role: 'recto', provenance: 'composite' })])).toBe(-1)
    expect(primaryImageRow([])).toBe(-1)
  })
})

describe('the work publish guard (CONTENT-MODEL.md §9)', () => {
  it('lets a complete work publish', () => {
    expect(publishProblems(complete)).toEqual([])
  })

  it('lists every missing requirement at once, each on its field, in plain words', () => {
    const problems = publishProblems({
      title: '  ',
      objectType: null,
      date: null,
      hasMaker: false,
      hasPlaces: false,
      hasPrimaryPlace: false,
      images: [],
      isCopy: false,
      hasGrade: false,
      aiDraft: ['title', 'condition'],
    })
    expect(problems.map((problem) => problem.path)).toEqual([
      'title',
      'objectType',
      'date.precision',
      'makers',
      'images',
      'condition.grade',
      'cataloguing.aiDraft',
    ])
    expect(problems.find((p) => p.path === 'images')?.message).toMatch(
      /Add a photograph of the whole front/,
    )
    expect(problems.find((p) => p.path === 'cataloguing.aiDraft')?.message).toMatch(
      /An AI drafted Title and Condition, and nobody has checked them/,
    )
    for (const { message, summary } of problems) {
      expect(message).toMatch(/^[A-Z].*[.:]/)
      // The admin's toast splits its list at commas: a summary holds none.
      expect(summary).toMatch(/^[A-Z][^,]+$/)
    }
  })

  it('accepts any stated precision for the date, unknown included', () => {
    expect(publishProblems({ ...complete, date: { precision: 'unknown' } })).toEqual([])
  })

  it('takes a primary place or a maker, and says which is missing', () => {
    expect(publishProblems({ ...complete, hasMaker: false })).toEqual([])
    expect(publishProblems({ ...complete, hasPrimaryPlace: false })).toEqual([])
    expect(publishProblems({ ...complete, hasMaker: false, hasPrimaryPlace: false })).toMatchObject(
      [{ path: 'places', message: expect.stringMatching(/Mark one of the places as the primary/) }],
    )
  })

  it('refuses a work without a photographed recto, or whose recto has no alt text', () => {
    expect(publishProblems({ ...complete, images: [image({ role: 'detail' })] })).toMatchObject([
      { path: 'images', message: expect.stringMatching(/None of the images is a photograph/) },
    ])
    expect(
      publishProblems({ ...complete, images: [image({ role: 'recto', provenance: 'composite' })] }),
    ).toMatchObject([
      { path: 'images', message: expect.stringMatching(/a mockup cannot lead the page/) },
    ])
    expect(
      publishProblems({ ...complete, images: [image({ role: 'verso' }), image({ alt: ' ' })] }),
    ).toMatchObject([
      { path: 'images.1.media', message: expect.stringMatching(/Describe the recto/) },
    ])
  })

  it('refuses an image waiting on a re-take, and an AI-drafted description', () => {
    expect(
      imagePublishProblems([image(), image({ role: 'verso', masterVerdict: 'fix-owner' })]),
    ).toMatchObject([{ row: 1, message: expect.stringMatching(/waits on a re-take/) }])
    expect(imagePublishProblems([image({ altSource: 'ai-draft' })])).toMatchObject([
      { row: 0, message: expect.stringMatching(/An AI drafted this image’s description/) },
    ])
    expect(imagePublishProblems([image({ altSource: 'baseline' })])).toEqual([])
  })

  it('wants a grade for an original, never for a provenance copy', () => {
    expect(publishProblems({ ...complete, hasGrade: false })).toMatchObject([
      { path: 'condition.grade', message: expect.stringMatching(/Grade the condition/) },
    ])
    expect(publishProblems({ ...complete, hasGrade: false, isCopy: true })).toEqual([])
  })

  it('never reads a location or an export status: a blank one makes the item enquiry-only', () => {
    const facts = { ...complete, physical: { location: null, exportStatus: null } }
    expect(publishProblems(facts as PublishFacts)).toEqual([])
    expect(Object.keys(complete)).not.toContain('physical')
  })
})

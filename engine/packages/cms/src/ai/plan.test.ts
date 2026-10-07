/**
 * From a checked reply to the write (TASKS.md 8.3.a–b): only empty fields, only the allow-list,
 * only existing vocabulary, dimensions only from a visible scale.
 */
import { describe, expect, it } from 'vitest'

import { goodReply } from './draft.test-support'
import { allowListed, planDraft, type CurrentWork } from './plan'
import { parseDraftReply, type DraftReply } from './reply'

const reply = (over: Record<string, unknown> = {}): DraftReply => {
  const parsed = parseDraftReply(JSON.stringify(goodReply(over)))
  if (!parsed.ok) throw new Error(parsed.reason)
  return parsed.reply
}

const empty: CurrentWork = {
  title: null,
  objectType: null,
  date: null,
  places: [],
  subjects: [],
  dimensions: { image: { height: null, width: null }, sheet: null, framed: null },
}
const matches = { places: [7], subjects: [9], unmatchedPlaces: ['Atlantis'], unmatchedSubjects: [] }

describe('the drafting plan (8.3.a–b)', () => {
  it('fills every empty allow-listed field, and suggests the description it cannot write', () => {
    const plan = planDraft(reply(), empty, matches)
    expect(plan.filled).toEqual(['title', 'objectType', 'date', 'places', 'subjects', 'dimensions'])
    expect(plan.patch).toEqual({
      title: 'Insula Bali, after Valentijn',
      objectType: 'map',
      date: { precision: 'circa', from: 1726, to: null },
      places: [{ place: 7, role: 'depicts', primary: true }],
      subjects: [9],
      dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
    })
    expect(plan.skipped).toEqual([{ field: 'description', reason: 'no_field' }])
    expect(plan.suggestions.description?.en).toMatch(/engraved map of Bali/)
    expect(plan.suggestions.unmatchedPlaces).toEqual(['Atlantis'])
  })

  it('a field the editor filled is not overwritten', () => {
    const plan = planDraft(
      reply(),
      { ...empty, title: 'Bali, as the editor wrote it', subjects: [3], date: { precision: 'unknown' } },
      matches,
    )
    expect(plan.patch).not.toHaveProperty('title')
    expect(plan.patch).not.toHaveProperty('subjects')
    expect(plan.patch).not.toHaveProperty('date')
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        { field: 'title', reason: 'filled' },
        { field: 'subjects', reason: 'filled' },
        { field: 'date', reason: 'filled' },
      ]),
    )
  })

  it('leaves dimensions empty unless a scale is visible, and invents no vocabulary', () => {
    const noScale = reply({
      dimensions: { scaleVisible: false, image: { height: 280, width: 360 }, sheet: null, confidence: 'low', basis: 'guess' },
    })
    const plan = planDraft(noScale, empty, { places: [], subjects: [], unmatchedPlaces: ['Bali'], unmatchedSubjects: ['VOC'] })
    expect(plan.patch).not.toHaveProperty('dimensions')
    expect(plan.patch).not.toHaveProperty('places')
    expect(plan.patch).not.toHaveProperty('subjects')
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        { field: 'dimensions', reason: 'no_scale' },
        { field: 'places', reason: 'no_match' },
        { field: 'subjects', reason: 'no_match' },
      ]),
    )
  })

  it('refuses a date or a size the work’s own validators would refuse', () => {
    const plan = planDraft(
      reply({
        date: { precision: 'range', from: 1730, to: 1720, confidence: 'low', basis: '' },
        dimensions: { scaleVisible: true, image: { height: 400, width: 500 }, sheet: { height: 300, width: 400 }, confidence: 'low', basis: '' },
      }),
      empty,
      matches,
    )
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        { field: 'date', reason: 'invalid' },
        { field: 'dimensions', reason: 'invalid' },
      ]),
    )
  })

  it('a model reply that sets grade, provenance or a price writes none of them — the allow-list, not the prompt', () => {
    // A reply that somehow carried them past the parser (a future schema change, a bug): the
    // write is still only the allow-list.
    const polluted = {
      ...reply(),
      grade: { value: 'A+' },
      condition: { grade: 1 },
      provenance: [{ holder: 'A prince' }],
      askingPrice: 1,
      status: 'sold',
      _status: 'published',
      cataloguing: { status: 'verified' },
    } as unknown as DraftReply
    const plan = planDraft(polluted, empty, matches)
    expect(Object.keys(plan.patch).sort()).toEqual(
      ['date', 'dimensions', 'objectType', 'places', 'subjects', 'title'].sort(),
    )
    expect(
      allowListed({ title: 'T', askingPrice: 1, provenance: [], condition: {}, physical: {}, _status: 'published' }),
    ).toEqual({ title: 'T' })
  })
})

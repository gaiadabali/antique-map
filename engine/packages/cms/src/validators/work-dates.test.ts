import { describe, expect, it } from 'vitest'

import { hasStatedDate, workDateErrors } from './work-dates'

const LATEST = 2026

describe('a work’s dates (8.2.b): order and precision', () => {
  it('accepts a circa date, an exact one, a range and an unknown one', () => {
    expect(workDateErrors({ date: { precision: 'circa', from: 1726 } }, LATEST)).toEqual({})
    expect(workDateErrors({ date: { precision: 'exact', from: 1726 } }, LATEST)).toEqual({})
    expect(workDateErrors({ date: { precision: 'range', from: 1724, to: 1726 } }, LATEST)).toEqual(
      {},
    )
    expect(workDateErrors({ date: { precision: 'unknown' } }, LATEST)).toEqual({})
    expect(workDateErrors({}, LATEST)).toEqual({})
  })

  it('never implies a date certain: a year without a precision is refused', () => {
    expect(workDateErrors({ date: { from: 1726 } }, LATEST)).toEqual({
      'date.precision': expect.stringMatching(/say how certain/),
    })
    expect(workDateErrors({ firstEdition: { precision: null, from: 1700 } }, LATEST)).toEqual({
      'firstEdition.precision': expect.stringMatching(/say how certain/),
    })
  })

  it('keeps a range in order and a single year single', () => {
    expect(workDateErrors({ date: { precision: 'range', from: 1726, to: 1724 } }, LATEST)).toEqual({
      'date.to': 'A range ends after it starts.',
    })
    expect(workDateErrors({ date: { precision: 'circa', from: 1726, to: 1730 } }, LATEST)).toEqual({
      'date.to': 'Only a range has a second year.',
    })
    expect(workDateErrors({ date: { precision: 'circa' } }, LATEST)).toEqual({
      'date.from': 'Give the year, or set the date to unknown.',
    })
  })

  it('refuses a plate date after the date of this issue (CONTENT-MODEL.md §9)', () => {
    expect(
      workDateErrors(
        {
          date: { precision: 'exact', from: 1726 },
          dateOnPlate: { precision: 'exact', from: 1730 },
        },
        LATEST,
      ),
    ).toEqual({ 'dateOnPlate.from': expect.stringMatching(/plate comes after/) })
    // A fuzzy pair any reading allows passes: a plate "before 1730" beside an issue c. 1726.
    expect(
      workDateErrors(
        {
          date: { precision: 'circa', from: 1726 },
          dateOnPlate: { precision: 'before', from: 1726 },
        },
        LATEST,
      ),
    ).toEqual({})
    expect(
      workDateErrors(
        {
          date: { precision: 'range', from: 1724, to: 1730 },
          dateOnPlate: { precision: 'exact', from: 1728 },
        },
        LATEST,
      ),
    ).toEqual({})
  })

  it('refuses a first edition after this issue, and never compares the plate with it', () => {
    expect(
      workDateErrors(
        {
          date: { precision: 'exact', from: 1726 },
          firstEdition: { precision: 'exact', from: 1740 },
        },
        LATEST,
      ),
    ).toEqual({ 'firstEdition.from': expect.stringMatching(/first edition comes after/) })
    // A later state's re-dated plate may postdate the first edition.
    expect(
      workDateErrors(
        {
          date: { precision: 'exact', from: 1760 },
          firstEdition: { precision: 'exact', from: 1726 },
          dateOnPlate: { precision: 'exact', from: 1750 },
        },
        LATEST,
      ),
    ).toEqual({})
  })

  it('says whether a date is stated, unknown included, for the publish guard', () => {
    expect(hasStatedDate({ precision: 'unknown' })).toBe(true)
    expect(hasStatedDate({ precision: 'circa' })).toBe(true)
    expect(hasStatedDate({ precision: null })).toBe(false)
    expect(hasStatedDate(null)).toBe(false)
  })
})

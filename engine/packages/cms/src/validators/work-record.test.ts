import { workTag } from '@engine/cache'
import { describe, expect, it } from 'vitest'

import {
  creditRowErrors,
  hasPrimaryPlace,
  placeRowErrors,
  referenceRowErrors,
  refId,
} from './work-credits'
import {
  costErrors,
  formatWorkUid,
  languageTagError,
  rightsErrors,
  stockNumberError,
  WORK_UID_PATTERN,
  workUidError,
} from './work-record'

describe('the work uid (CONTENT-MODEL.md §1)', () => {
  it('is the brand prefix and a zero-padded number, a shape @engine/cache tags', () => {
    expect(formatWorkUid('IG', 123)).toBe('IG-000123')
    expect(formatWorkUid('TG', 1_234_567)).toBe('TG-1234567')
    expect(workTag(formatWorkUid('OEI', 1))).toBe('work:OEI-000001')
    expect(() => formatWorkUid('ig', 1)).toThrow(/prefix/)
    expect(() => formatWorkUid('IG', 0)).toThrow(/not a work number/)
  })

  it('accepts a script’s uid only in this brand’s shape', () => {
    expect(workUidError('TG-000004', 'TG')).toBeNull()
    expect(workUidError('IG-000004', 'TG')).toMatch(/start with TG-/)
    expect(workUidError('TG-4', 'TG')).toMatch(/prefix, a hyphen/)
    expect(WORK_UID_PATTERN.test('TG-000004 - Copy')).toBe(false)
  })
})

describe('a work’s single values', () => {
  it('holds a stock number to the brand’s pattern, when it has one', () => {
    expect(stockNumberError('M.1044', '^[MPF]\\.[A-Za-z0-9]+$')).toBeNull()
    expect(stockNumberError('X.1', '^[MPF]\\.[A-Za-z0-9]+$')).toMatch(/not one of this brand/)
    expect(stockNumberError('anything-goes', null)).toBeNull()
    expect(stockNumberError(' M.1', null)).toMatch(/no spaces/)
    expect(stockNumberError(null, '^M')).toBeNull()
  })

  it('takes a BCP-47 tag for a language', () => {
    for (const tag of ['nl', 'la', 'ms-Arab', 'jv']) expect(languageTagError(tag)).toBeNull()
    expect(languageTagError('not a tag')).toMatch(/language tag/)
    expect(languageTagError('')).toBeNull()
  })

  it('allows printing only on public-domain or licensed rights (COMPLIANCE.md §8)', () => {
    expect(rightsErrors({ status: 'public-domain', printAllowed: true })).toEqual({})
    expect(rightsErrors({ status: 'rights-pending', printAllowed: true })).toEqual({
      printAllowed: expect.stringMatching(/public domain or under a licence/),
    })
    expect(rightsErrors({ printAllowed: true })).toHaveProperty('printAllowed')
    expect(rightsErrors({ status: 'licensed', holder: 'Estate', printAllowed: true })).toEqual({
      licenceRef: expect.stringMatching(/licence’s reference/),
    })
    expect(rightsErrors({ status: 'licensed' })).toEqual({ holder: expect.any(String) })
    expect(rightsErrors({ status: 'restricted', printAllowed: false })).toEqual({})
    expect(rightsErrors({ territories: ['ID', 'WORLD', 'nl'] })).toEqual({
      territories: expect.stringMatching(/"nl" is not a territory/),
    })
  })

  it('keeps an acquisition cost as Money: a safe integer of minor units, with its currency', () => {
    expect(costErrors({ amount: 125_000_000, currency: 'IDR' })).toEqual({})
    expect(costErrors({ amount: 1250.5, currency: 'USD' })).toEqual({ amount: expect.any(String) })
    expect(costErrors({ amount: -1, currency: 'USD' })).toEqual({ amount: expect.any(String) })
    expect(costErrors({ amount: 2 ** 53, currency: 'USD' })).toEqual({ amount: expect.any(String) })
    expect(costErrors({ amount: 100 })).toEqual({
      currency: expect.stringMatching(/which currency/),
    })
    expect(costErrors({ currency: 'EUR' })).toEqual({ amount: expect.any(String) })
    expect(costErrors({ amount: 1, currency: 'XYZ' })).toEqual({ currency: expect.any(String) })
    expect(costErrors(null)).toEqual({})
  })
})

describe('a work’s credits, places and references', () => {
  it('reads a relation as an id or a populated document', () => {
    expect(refId(3)).toBe('3')
    expect(refId({ id: 3, name: 'x' })).toBe('3')
    expect(refId('')).toBeNull()
    expect(refId(null)).toBeNull()
  })

  it('refuses a maker credited twice in one role, never in two', () => {
    expect(
      creditRowErrors([
        { maker: 1, role: 'engraver' },
        { maker: 1, role: 'publisher' },
        { maker: { id: 1 }, role: 'engraver' },
      ]),
    ).toEqual([null, null, expect.stringMatching(/already credited in this role/)])
  })

  it('allows one primary place, and no place twice in one role', () => {
    const rows = [
      { place: 1, role: 'depicts', primary: true },
      { place: 2, role: 'depicts', primary: true },
      { place: 1, role: 'depicts' },
      { place: 1, role: 'published-at' },
    ]
    expect(placeRowErrors(rows)).toEqual({
      place: [null, null, expect.stringMatching(/already listed/), null],
      primary: [null, expect.stringMatching(/Only one place is primary/), null, null],
    })
    expect(hasPrimaryPlace(rows)).toBe(true)
    expect(hasPrimaryPlace([{ place: 1, role: 'depicts' }])).toBe(false)
    expect(hasPrimaryPlace(undefined)).toBe(false)
  })

  it('refuses the same source and number twice', () => {
    expect(
      referenceRowErrors([
        { source: 4, ref: '1268' },
        { source: 4, ref: ' 1268 ' },
        { source: 5, ref: '1268' },
      ]),
    ).toEqual([null, expect.stringMatching(/already listed/), null])
  })
})

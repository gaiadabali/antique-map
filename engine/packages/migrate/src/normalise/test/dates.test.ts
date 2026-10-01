import { describe, expect, it } from 'vitest'

import { parseDate, splitPublication } from '../dates.ts'
import { DEFAULT_TABLES } from '../tables.ts'

const date = (text: string | null) => parseDate(text, DEFAULT_TABLES)

describe('parseDate — precision is part of the fact', () => {
  it.each([
    ['1725', { precision: 'exact', from: 1725, to: null, display: null }],
    ['c. 1720', { precision: 'circa', from: 1720, to: null, display: null }],
    ['ca.1795', { precision: 'circa', from: 1795, to: null, display: null }],
    ['ca1750', { precision: 'circa', from: 1750, to: null, display: null }],
    ['Circa 1890', { precision: 'circa', from: 1890, to: null, display: null }],
    ['1720-1730', { precision: 'range', from: 1720, to: 1730, display: null }],
    ['1724 - 26', { precision: 'range', from: 1724, to: 1726, display: null }],
    ['1806 – 07', { precision: 'range', from: 1806, to: 1807, display: null }],
    ['18th century', { precision: 'range', from: 1701, to: 1800, display: '18th century' }],
    ['17th century', { precision: 'range', from: 1601, to: 1700, display: '17th century' }],
    ['Year 1869', { precision: 'exact', from: 1869, to: null, display: null }],
    ['before 1700', { precision: 'before', from: 1700, to: null, display: null }],
    ['after 1750', { precision: 'after', from: 1750, to: null, display: null }],
  ])('reads %j', (text, expected) => {
    const parsed = date(text)
    expect(parsed.status).toBe('parsed')
    expect(parsed.value).toEqual(expected)
    expect(parsed.raw).toBe(text)
    expect(parsed.confidence).toBe(1)
  })

  it.each([
    ['null', 'printed "null"'],
    ['Leiden', 'no year'],
    ['950', 'three-digit'],
    ['P.2028', 'unrecognised'],
    ['1835 ( First Edition )2', 'unrecognised'],
    ['ca. 1690-1700', 'circa range'],
    ['1730-1720', 'ends before it starts'],
    ['1493-1602', 'wider than a century'],
    ['22th century', 'wrong ordinal'],
    ['1250', 'outside 1400–2030'],
  ])('sends %j to review (%s), never guessing', (text, reason) => {
    const parsed = date(text)
    expect(parsed.status).toBe('review')
    expect(parsed.value).toBeNull()
    expect(parsed.reason).toContain(reason)
    expect(parsed.confidence).toBeLessThan(0.9)
  })

  it('leaves a blank year empty', () => {
    expect(date(null).status).toBe('empty')
    expect(date('  ').status).toBe('empty')
  })

  it('proposes a circa range without applying it', () => {
    expect(date('ca. 1880-90').proposal).toEqual({
      precision: 'range',
      from: 1880,
      to: 1890,
      display: null,
    })
  })
})

describe('splitPublication — "Place / Date (note)" in one field', () => {
  it.each([
    ['Leiden / 1883', { place: 'Leiden', dateText: '1883', note: null }],
    ['/ Paris / 1849', { place: 'Paris', dateText: '1849', note: null }],
    ['/ Paris 1849', { place: 'Paris', dateText: '1849', note: null }],
    ['Leiden, ca. 1700', { place: 'Leiden', dateText: 'ca. 1700', note: null }],
    ['Indonesia/ca.1880-90', { place: 'Indonesia', dateText: 'ca.1880-90', note: null }],
    ['Amsterdam / 1724 - 26', { place: 'Amsterdam', dateText: '1724 - 26', note: null }],
    ['London / 1860 (first edition)', { place: 'London', dateText: '1860', note: 'first edition' }],
    ['Batavia (Jakarta)/1874', { place: 'Batavia (Jakarta)', dateText: '1874', note: null }],
    [
      'The Netherlands / Year 1869',
      { place: 'The Netherlands', dateText: 'Year 1869', note: null },
    ],
    ['ca. 1600', { place: null, dateText: 'ca. 1600', note: null }],
    ['Batavia', { place: 'Batavia', dateText: null, note: null }],
    ['', { place: null, dateText: null, note: null }],
  ])('splits %j', (text, expected) => {
    expect(splitPublication(text)).toEqual(expected)
  })

  it('keeps text it cannot place in the date, so the date goes to review', () => {
    expect(splitPublication('P.2028')).toEqual({ place: null, dateText: 'P.2028', note: null })
    expect(splitPublication('Paris / 1835 ( First Edition )2').dateText).toBe(
      '1835 ( First Edition )2',
    )
  })
})

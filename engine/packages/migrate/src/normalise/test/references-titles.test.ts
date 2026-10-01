import { describe, expect, it } from 'vitest'

import { parseReferences } from '../references.ts'
import { DEFAULT_TABLES, parseTables } from '../tables.ts'
import { parseTitles } from '../titles.ts'

const refs = (html: string | null) => parseReferences(html, DEFAULT_TABLES)

describe('parseReferences — structured only where the pattern is unambiguous', () => {
  it.each([
    [
      '<p>( Ref: Tooley, R.V. (Australia) 1268. )</p>',
      [{ source: 'Tooley, R.V. (Australia)', ref: '1268' }],
    ],
    ['<p>A map (Ref: Tiele 1234) of note.</p>', [{ source: 'Tiele', ref: '1234' }]],
    [
      '<p>( Ref. Tooley 670; Suarez p. 209; Schilder p 204; Clancy 6.14. )</p>',
      [
        { source: 'Tooley', ref: '670' },
        { source: 'Suarez', ref: 'p. 209' },
        { source: 'Schilder', ref: 'p 204' },
        { source: 'Clancy', ref: '6.14' },
      ],
    ],
    ['<p>Rare. Ref: Koeman Aa9</p>', [{ source: 'Koeman', ref: 'Aa9' }]],
    ['<p>(ref. Van der Krogt 1234)</p>', [{ source: 'Van der Krogt', ref: '1234' }]],
  ])('reads %j', (html, expected) => {
    expect(refs(html)).toMatchObject({ status: 'parsed', value: expected })
  })

  it.each([
    ['<p>(Ref: Koeman, Atlantes Neerlandici, Val 1.)</p>', null],
    ['<p>(Ref: Shirley)</p>', null],
    ['<p>(Ref: Koeman Aa9; Phillips 2780 note.)</p>', [{ source: 'Koeman', ref: 'Aa9' }]],
    ['<p>( Ref:</p>', null],
  ])('sends %j to review with the citation raw', (html, proposal) => {
    const parsed = refs(html)
    expect(parsed).toMatchObject({ status: 'review', value: null, proposal })
    expect(parsed.raw).toMatch(/Ref/)
  })

  it('reads two citations in one description, and both raw texts', () => {
    const parsed = refs('<p>(Ref: Tiele 1234) and ( Ref: Schilder 42. )</p>')
    expect(parsed.value).toHaveLength(2)
    expect(parsed.raw).toBe('(Ref: Tiele 1234) | ( Ref: Schilder 42. )')
  })

  it('ignores the word in running prose', () => {
    expect(
      refs('<p>In a clear reference to the voyage. A separate reference. Graffiti.</p>').status,
    ).toBe('empty')
    expect(refs(null).status).toBe('empty')
  })
})

describe('parseTitles — the hook title and the original, SEO suffixes moved out', () => {
  const tables = parseTables({ seoSuffixes: ['Extremely rare map'] })
  const titles = (
    hook: string | null,
    original: string | null = null,
    makerName: string | null = null,
  ) => parseTitles({ hook, original, makerName }, tables)

  it.each([
    ['Map of the Moluccas - Year 1725', 'Map of the Moluccas', ['Year 1725']],
    [
      'Kaart van het Eyland Bali - Extremely rare map',
      'Kaart van het Eyland Bali',
      ['Extremely rare map'],
    ],
    ['Sumatra - Year 1640 - Extremely rare map', 'Sumatra', ['Year 1640', 'Extremely rare map']],
    ['Gatiliers Plant, ca. 1795', 'Gatiliers Plant', ['ca. 1795']],
    ['Snail shells by A. Maker, year 1849', 'Snail shells by A. Maker', ['year 1849']],
    ['Birds, year 1830 (set of 4)', 'Birds (set of 4)', ['year 1830']],
    ['Asia Dutch map, ca.1690-1700', 'Asia Dutch map', ['ca.1690-1700']],
    ['Hummingbird Print - Paris, 1830 (10)', 'Hummingbird Print - Paris, 1830 (10)', []],
    ['Achyranthes Porrigens. ca. 1795', 'Achyranthes Porrigens', ['ca. 1795']],
    ['South East Asia ~ c.1789', 'South East Asia', ['c.1789']],
  ])('hook %j → %j', (hook, title, seoSuffixes) => {
    expect(titles(hook).title).toMatchObject({
      status: 'parsed',
      value: { title, seoSuffixes },
      raw: hook,
    })
  })

  it.each([
    ['Asia - Antique Map', 'Asia', 'SEO suffix the tables do not list'],
    ['Studio Portrait circa 1880-90', 'Studio Portrait', 'no separator'],
    [
      'Birds, Year 1835, A. Maker (set of 4) A',
      'Birds, A. Maker (set of 4) A',
      'middle of the title',
    ],
  ])('sends hook %j to review, proposing %j', (hook, title, reason) => {
    const parsed = titles(hook).title
    expect(parsed).toMatchObject({ status: 'review', value: null })
    expect(parsed.proposal?.title).toBe(title)
    expect(parsed.reason).toContain(reason)
  })

  it('moves the maker’s byline and year out of the original title', () => {
    const parsed = titles(
      'Bodhi Tree',
      'Ficus Religiosa from Hortus Malabaricus by A. B. Maker, year 1693',
      'A. B. Maker',
    )
    expect(parsed.originalTitle.value).toEqual({
      title: 'Ficus Religiosa from Hortus Malabaricus',
      seoSuffixes: ['by A. B. Maker', 'year 1693'],
    })
  })

  it('leaves the original empty when it only repeats the hook, and reviews a stranger’s byline', () => {
    expect(titles('Palace of the King', 'Palace of the King').originalTitle).toMatchObject({
      status: 'empty',
      reason: 'the same as the hook title',
    })
    expect(
      titles('Asia', 'Nuova Carta dell Asia by T. Other', 'A. Maker').originalTitle.status,
    ).toBe('review')
    expect(titles('Asia', 'Asiae Nova Descriptio.').originalTitle.value?.title).toBe(
      'Asiae Nova Descriptio.',
    )
  })

  it('leaves blank titles empty', () => {
    expect(titles(null).title.status).toBe('empty')
    expect(titles('x', ' ').originalTitle.status).toBe('empty')
  })
})

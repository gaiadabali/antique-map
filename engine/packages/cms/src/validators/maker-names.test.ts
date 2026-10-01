import { describe, expect, it } from 'vitest'

import { aliasErrors, sameAsErrors, sameAsKey } from './maker-names'

describe('a maker’s other spellings', () => {
  it('accepts distinct spellings', () => {
    expect(aliasErrors(['Valentyn', 'Franciscus Valentinus'], 'François Valentijn')).toEqual([])
  })

  it('refuses the name itself, a repeat and a blank row', () => {
    const errors = aliasErrors(
      ['francois valentijn', 'Valentyn', 'VALENTYN', ''],
      'François Valentijn',
    )
    expect(errors[0]).toMatch(/the name itself/)
    expect(errors[1]).toBeUndefined()
    expect(errors[2]).toBe('"VALENTYN" is already listed (row 2).')
    expect(errors[3]).toMatch(/Give the other spelling/)
  })
})

describe('a maker’s authority records', () => {
  it('treats a trailing slash and the host’s case as the same record', () => {
    expect(sameAsKey('https://WWW.wikidata.org/wiki/Q1384583/')).toBe(
      sameAsKey('https://www.wikidata.org/wiki/Q1384583'),
    )
  })

  it('refuses the same record twice', () => {
    const errors = sameAsErrors([
      'https://www.wikidata.org/wiki/Q1384583',
      'http://vocab.getty.edu/page/ulan/500115589',
      'https://www.wikidata.org/wiki/Q1384583/',
    ])
    expect(errors[0]).toBeUndefined()
    expect(errors[1]).toBeUndefined()
    expect(errors[2]).toMatch(/already linked \(row 1\)/)
  })
})

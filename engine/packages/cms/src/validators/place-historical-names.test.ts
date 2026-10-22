import { describe, expect, it } from 'vitest'

import { historicalNameErrors, nameKey } from './place-historical-names'

describe('a place’s historical names', () => {
  it('accepts names with a language code and a period', () => {
    expect(
      historicalNameErrors([
        { name: 'Batavia', language: 'nl', period: '1619–1942' },
        { name: 'Jayakarta', language: 'jv' },
        { name: 'Sunda Kelapa' },
        { name: '巴達維亞', language: 'zh-Hant' },
      ]),
    ).toEqual([])
    expect(historicalNameErrors(null)).toEqual([])
  })

  it('refuses a blank name and a language that is not a code', () => {
    const errors = historicalNameErrors([{ name: ' ' }, { name: 'Iava', language: 'Latin' }])
    expect(errors[0]?.name).toMatch(/Give the historical name/)
    expect(errors[1]?.language).toMatch(/language code/)
  })

  it('refuses the same name twice, whatever its case or accents', () => {
    const errors = historicalNameErrors([
      { name: 'Célèbes' },
      { name: 'Iava' },
      { name: 'celebes' },
    ])
    expect(errors[0]).toBeUndefined()
    expect(errors[1]).toBeUndefined()
    expect(errors[2]?.name).toBe('"celebes" is already listed (row 1).')
  })

  it('compares names by one spelling', () => {
    expect(nameKey('  Nieuw-Guinéa ')).toBe('nieuw-guinea')
  })
})

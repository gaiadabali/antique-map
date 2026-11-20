import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { areaAnchors } from './stores-view'

describe("an area's anchor", () => {
  it('is its name, lower-cased and hyphenated', () => {
    expect(areaAnchors(['Amed', 'Nusa Dua', 'Other areas'])).toEqual([
      'amed',
      'nusa-dua',
      'other-areas',
    ])
  })

  it('drops accents and stays unique on the page', () => {
    expect(areaAnchors(['Tabanan', 'Tábanan', '—'])).toEqual(['tabanan', 'tabanan-2', 'area'])
  })
})

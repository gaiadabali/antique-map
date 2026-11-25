import { describe, expect, it } from 'vitest'

import { groupByArea, groupByRegion, mapUrl, storeFrom } from './group'
import { OWNER_MAP_URL } from './owner-location'

describe('groupByArea', () => {
  const docs = [
    { name: 'Zeta', area: 'Ubud', address: 'A', hours: 'H' },
    { name: 'Nameless area', area: null },
    { name: 'Beta', area: 'Denpasar' },
    { name: 'Alpha', area: 'Ubud' },
    { name: 'Blank area', area: '  ' },
    { area: 'Ubud', name: '' },
    'junk',
  ]

  it('orders areas alphabetically, stores by name, and puts the no-area group last', () => {
    const groups = groupByArea(docs)
    expect(groups.map((g) => g.area)).toEqual(['Denpasar', 'Ubud', null])
    expect(groups[1]?.stores.map((s) => s.name)).toEqual(['Alpha', 'Zeta'])
    expect(groups[2]?.stores.map((s) => s.name)).toEqual(['Blank area', 'Nameless area'])
  })

  it('drops docs without a name and keeps nothing beyond the public fields', () => {
    const [first] = groupByArea([
      { name: 'S', area: 'X', code: 'UBD-003', whatsapp: '+62811', lat: -8.5, notes: 'n' },
    ])
    expect(Object.keys(first?.stores[0] ?? {}).sort()).toEqual([
      'address',
      'hours',
      'mapUrl',
      'name',
    ])
  })
})

describe('mapUrl', () => {
  it('encodes name and address into the search query', () => {
    expect(mapUrl('Toko & Co', 'Jl. Raya 5, Ubud')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Toko%20%26%20Co%2C%20Jl.%20Raya%205%2C%20Ubud',
    )
  })
  it('falls back to the name alone without an address', () => {
    expect(mapUrl('Solo', null)).toBe('https://www.google.com/maps/search/?api=1&query=Solo')
  })
  it("opens the owner's one address for every store until each has its own (2026-11-25)", () => {
    expect(storeFrom({ name: 'Solo', address: 'Jl. X', lat: 1, lng: 2 })?.mapUrl).toBe(
      OWNER_MAP_URL,
    )
  })
})

describe('groupByRegion (TASKS.md 28.2; the order of 2026-11-25)', () => {
  it('puts the flagships first, then one store each of Lombok, Ubud, Amed, Canggu, then Nearby', () => {
    const data = groupByRegion([
      { name: 'Zed', region: 'other' },
      { name: 'Beach', region: 'canggu' },
      { name: 'Flag B', region: 'ubud', flagship: true },
      { name: 'Hill', region: 'ubud' },
      { name: 'Bridge', region: 'ubud' },
      { name: 'No region' },
      { name: 'Flag A', flagship: true },
      { name: 'Gili', region: 'lombok' },
      { name: '' },
    ])
    expect(data.total).toBe(8)
    expect(data.flagships.map((s) => s.name)).toEqual(['Flag A', 'Flag B'])
    expect(data.regions.map((g) => [g.region, g.stores.map((s) => s.name)])).toEqual([
      ['lombok', ['Gili']],
      ['ubud', ['Bridge']],
      ['canggu', ['Beach']],
    ])
    // A region's stores past its first, and the stores of no region, by name.
    expect(data.nearby.map((s) => s.name)).toEqual(['Hill', 'No region', 'Zed'])
  })

  it('has no flagship section when none is set', () => {
    expect(groupByRegion([{ name: 'A', region: 'amed' }]).flagships).toEqual([])
  })
})

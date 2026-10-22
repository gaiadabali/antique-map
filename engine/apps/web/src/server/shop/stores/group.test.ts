import { describe, expect, it } from 'vitest'

import { groupByArea, mapUrl, storeFrom } from './group'

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
  it('falls back to the name alone without an address, and never uses coordinates', () => {
    expect(storeFrom({ name: 'Solo', lat: 1, lng: 2 })?.mapUrl).toBe(
      'https://www.google.com/maps/search/?api=1&query=Solo',
    )
  })
})

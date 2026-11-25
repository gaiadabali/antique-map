import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { groupByArea, groupByRegion, mapUrl, positionOf, storeFrom } from './group'
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
      'image',
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
    // Each region counts the stores it left to Nearby, and they keep their region for its link.
    expect(data.regions.map((g) => [g.region, g.more])).toEqual([
      ['lombok', 0],
      ['ubud', 1],
      ['canggu', 0],
    ])
    expect(data.nearby.map((s) => s.region)).toEqual(['ubud', null, null])
  })

  it("gives Nearby each store's position to about a kilometre, and the regions none", () => {
    const data = groupByRegion([
      { name: 'Hill', region: 'ubud', lat: -8.506912, lng: 115.262504 },
      { name: 'Lane', region: 'ubud', lat: -8.51, lng: 115.27 },
      { name: 'Loose' },
    ])
    expect(data.regions[0]?.stores[0]).not.toHaveProperty('position')
    expect(data.nearby.map((s) => [s.name, s.position])).toEqual([
      ['Lane', { lat: -8.51, lng: 115.27 }],
      ['Loose', null],
    ])
  })

  it('lists Nearby by area, as its cards name it, then by name; no area last', () => {
    const data = groupByRegion([
      { name: 'Alpha', area: 'Ubud' },
      { name: 'Bravo' },
      { name: 'Delta', area: 'Amed' },
      { name: 'Charlie', area: 'Amed' },
      { name: 'Echo', area: 'Canggu' },
    ])
    expect(data.nearby.map((s) => s.name)).toEqual(['Charlie', 'Delta', 'Echo', 'Alpha', 'Bravo'])
  })

  it('has no flagship section when none is set', () => {
    expect(groupByRegion([{ name: 'A', region: 'amed' }]).flagships).toEqual([])
  })
})

describe('positionOf', () => {
  it('rounds to two decimals and needs both coordinates, each in range', () => {
    expect(positionOf({ lat: -8.506912, lng: 115.262504 })).toEqual({ lat: -8.51, lng: 115.26 })
    expect(positionOf({ lat: -8.5 })).toBeNull()
    expect(positionOf({ lat: 'x', lng: 115 })).toBeNull()
    expect(positionOf({ lat: 91, lng: 115 })).toBeNull()
    expect(positionOf(null)).toBeNull()
  })
})

describe("a store's own photograph", () => {
  const BASE = 'https://media.example.test/indies-media'
  const ID = '0123456789abcdef0123456789abcdef'
  const previous = process.env.MEDIA_PUBLIC_URL
  beforeEach(() => {
    process.env.MEDIA_PUBLIC_URL = BASE
  })
  afterEach(() => {
    if (previous === undefined) delete process.env.MEDIA_PUBLIC_URL
    else process.env.MEDIA_PUBLIC_URL = previous
  })
  const media = (extra: Record<string, unknown> = {}) => ({
    url: '/api/media/file/shop.jpg',
    alt: 'The shop front',
    width: 640,
    height: 480,
    assetId: ID,
    derivatives: { status: 'ready' },
    ...extra,
  })

  it('carries the first published image as its public derivative', () => {
    const store = storeFrom({
      name: 'S',
      images: [{ image: media({ derivatives: { status: 'pending' } }) }, { image: media() }],
    })
    expect(store?.image).toEqual({
      url: `${BASE}/derivatives/v1/${ID}/640.webp`,
      alt: 'The shop front',
      width: 640,
      height: 480,
      srcSet: expect.stringContaining('320.webp 320w'),
    })
  })

  it.each([
    ['no images', {}],
    ['an empty list', { images: [] }],
    ['an unpopulated id', { images: [{ image: 12 }] }],
    ['an unpublished derivative', { images: [{ image: media({ derivatives: null }) }] }],
  ])('is null for %s, so the card falls back to the shared photos', (_label, extra) => {
    expect(storeFrom({ name: 'S', ...extra })?.image).toBeNull()
  })

  it('keeps the image on a region card and on Nearby', () => {
    const data = groupByRegion([
      { name: 'A', region: 'ubud', images: [{ image: media() }] },
      { name: 'B', region: 'ubud', images: [{ image: media() }] },
    ])
    expect(data.regions[0]?.stores[0]?.image?.alt).toBe('The shop front')
    expect(data.nearby[0]?.image?.alt).toBe('The shop front')
  })
})

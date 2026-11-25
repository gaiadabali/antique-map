import { describe, expect, it } from 'vitest'

import { distanceKm, nearestFirst } from './distance'

const UBUD = { lat: -8.51, lng: 115.26 }
const CANGGU = { lat: -8.65, lng: 115.13 }
const DENPASAR = { lat: -8.65, lng: 115.22 }

describe('distanceKm', () => {
  it('is zero at the same place and about 21 km from Ubud to Canggu', () => {
    expect(distanceKm(UBUD, UBUD)).toBe(0)
    expect(distanceKm(UBUD, CANGGU)).toBeGreaterThan(19)
    expect(distanceKm(UBUD, CANGGU)).toBeLessThan(23)
  })
})

describe('nearestFirst', () => {
  it('sorts nearest first, keeps a store with no position last, and adds each distance', () => {
    const sorted = nearestFirst(
      [
        { name: 'Unplaced', position: null },
        { name: 'Canggu', position: CANGGU },
        { name: 'Ubud', position: UBUD },
        { name: 'Denpasar', position: DENPASAR },
      ],
      { lat: -8.66, lng: 115.14 },
    )
    expect(sorted.map((store) => store.name)).toEqual(['Canggu', 'Denpasar', 'Ubud', 'Unplaced'])
    expect(sorted[0]?.km).toBeLessThan(2)
    expect(sorted[3]?.km).toBeNull()
  })

  it('keeps the order of stores without a position', () => {
    const sorted = nearestFirst(
      [
        { name: 'B', position: null },
        { name: 'A', position: null },
      ],
      UBUD,
    )
    expect(sorted.map((store) => store.name)).toEqual(['B', 'A'])
  })
})

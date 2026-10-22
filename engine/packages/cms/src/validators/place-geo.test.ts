import { describe, expect, it } from 'vitest'

import { geoErrors, withinLongitudes } from './place-geo'

describe('a place’s geo', () => {
  it('accepts nothing, a point, or a point inside its box', () => {
    expect(geoErrors(null)).toEqual({})
    expect(geoErrors({})).toEqual({})
    expect(geoErrors({ lat: -6.13, lng: 106.81 })).toEqual({})
    expect(
      geoErrors({
        lat: -7.5,
        lng: 110,
        bbox: { west: 105.1, south: -8.8, east: 114.6, north: -5.8 },
      }),
    ).toEqual({})
  })

  it('keeps degrees in range', () => {
    const errors = geoErrors({ lat: 95, lng: -181 })
    expect(errors.lat).toMatch(/-90 and 90/)
    expect(errors.lng).toMatch(/-180 and 180/)
  })

  it('needs both halves of a point', () => {
    expect(geoErrors({ lat: -6 }).lng).toMatch(/both/)
    expect(geoErrors({ lng: 106 }).lat).toMatch(/both/)
  })

  it('needs all four edges of a box, south of north', () => {
    const half = geoErrors({ bbox: { west: 105 } })
    expect(Object.keys(half).sort()).toEqual(['bbox.east', 'bbox.north', 'bbox.south'])
    expect(geoErrors({ bbox: { west: 1, south: 5, east: 2, north: 4 } })['bbox.north']).toMatch(
      /north of the south/,
    )
    expect(geoErrors({ bbox: { west: 1, south: 1, east: 1, north: 2 } })['bbox.east']).toMatch(
      /differs/,
    )
  })

  it('takes a box across the antimeridian (west greater than east)', () => {
    const pacific = { west: 110, south: -50, east: -120, north: 10 }
    expect(geoErrors({ lat: -20, lng: 178, bbox: pacific })).toEqual({})
    expect(geoErrors({ lat: -20, lng: -170, bbox: pacific })).toEqual({})
    expect(geoErrors({ lat: -20, lng: 0, bbox: pacific }).lat).toMatch(/outside the box/)
    expect(withinLongitudes(179.9, 170, -170)).toBe(true)
    expect(withinLongitudes(160, 170, -170)).toBe(false)
  })

  it('refuses a point outside its box', () => {
    expect(
      geoErrors({ lat: 10, lng: 110, bbox: { west: 105, south: -9, east: 115, north: -5 } }).lat,
    ).toMatch(/outside the box/)
  })
})

/**
 * The store location field's arithmetic (TASKS.md 27.4.a): a nudge moves the pin about the metres
 * it says, the pin keeps six decimals, and the map link is Google's documented search link.
 */
import { describe, expect, it } from 'vitest'

import { coordinate, insideIndonesia, mapsLink, nudge, pinOf, pinText, round6 } from './geo'

const UBUD = { lat: -8.5069, lng: 115.2625 }

/** The distance between two pins in metres (equirectangular — fine for a few hundred metres). */
const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const x = (((b.lng - a.lng) * Math.PI) / 180) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  const y = ((b.lat - a.lat) * Math.PI) / 180
  return Math.sqrt(x * x + y * y) * 6_371_000
}

describe('nudge', () => {
  it('moves the pin about the metres asked, in the direction asked', () => {
    for (const step of [10, 50, 250]) {
      const north = nudge(UBUD, 'north', step)
      expect(north.lat).toBeGreaterThan(UBUD.lat)
      expect(north.lng).toBe(UBUD.lng)
      expect(Math.abs(metres(UBUD, north) - step)).toBeLessThan(0.5)
      const east = nudge(UBUD, 'east', step)
      expect(east.lng).toBeGreaterThan(UBUD.lng)
      expect(Math.abs(metres(UBUD, east) - step)).toBeLessThan(0.5)
    }
    expect(nudge(UBUD, 'south', 10).lat).toBeLessThan(UBUD.lat)
    expect(nudge(UBUD, 'west', 10).lng).toBeLessThan(UBUD.lng)
  })

  it('there and back again lands on the same pin', () => {
    const back = nudge(nudge(UBUD, 'east', 50), 'west', 50)
    expect(metres(UBUD, back)).toBeLessThan(0.2)
  })
})

describe('the pin as the form holds it', () => {
  it('reads numbers and numeric text, and nothing else', () => {
    expect(coordinate(-8.5)).toBe(-8.5)
    expect(coordinate(' 115.2 ')).toBe(115.2)
    expect(coordinate('')).toBeNull()
    expect(coordinate(null)).toBeNull()
    expect(coordinate('abc')).toBeNull()
    expect(pinOf(-8.5, null)).toBeNull()
    expect(pinOf('-8.5', 115.2)).toEqual({ lat: -8.5, lng: 115.2 })
  })

  it('keeps six decimals, shows them, and checks the Indonesia box', () => {
    expect(round6(-8.50690049)).toBe(-8.5069)
    expect(pinText(UBUD)).toBe('-8.506900, 115.262500')
    expect(insideIndonesia(UBUD)).toBe(true)
    expect(insideIndonesia({ lat: 115.2625, lng: -8.5069 })).toBe(false)
  })

  it('links to Google Maps with the pin dropped', () => {
    expect(mapsLink(UBUD)).toBe('https://www.google.com/maps/search/?api=1&query=-8.5069,115.2625')
  })
})

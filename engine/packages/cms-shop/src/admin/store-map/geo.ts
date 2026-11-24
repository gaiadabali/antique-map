/**
 * The store location field's arithmetic (TASKS.md 27.4.a), pure so the field and its tests share
 * it: a pin moved a few metres north, south, east or west; a pin rounded to the six decimals the
 * store's `lat`/`lng` fields step by (about 10 cm); and the "Check on Google Maps" link — a plain
 * link the owner opens in a new tab, never a script or a frame inside the admin (its CSP loads
 * nothing from a third party, `apps/web/src/security/csp.ts`).
 */
import { INDONESIA_BOUNDS } from '../../collections/stores/pin'

/** Metres in one degree of latitude (and of longitude at the equator). */
const METRES_PER_DEGREE = 111_320

export type Pin = { readonly lat: number; readonly lng: number }
export type Direction = 'north' | 'south' | 'east' | 'west'

/** The steps the nudge buttons offer, in metres. */
export const STEPS = [10, 50, 250] as const

export const round6 = (value: number): number => Math.round(value * 1e6) / 1e6

/** A coordinate the form holds, as a number, or null when there is none yet. */
export function coordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/** The pin the form holds, or null unless both halves are numbers. */
export function pinOf(lat: unknown, lng: unknown): Pin | null {
  const a = coordinate(lat)
  const b = coordinate(lng)
  return a === null || b === null ? null : { lat: a, lng: b }
}

/** Whether a pin is inside the stores' Indonesia box (`collections/stores/pin`). */
export const insideIndonesia = (pin: Pin): boolean =>
  pin.lat >= INDONESIA_BOUNDS.lat.min &&
  pin.lat <= INDONESIA_BOUNDS.lat.max &&
  pin.lng >= INDONESIA_BOUNDS.lng.min &&
  pin.lng <= INDONESIA_BOUNDS.lng.max

/** `pin` moved `metres` towards `direction`, rounded to the field's six decimals. */
export function nudge(pin: Pin, direction: Direction, metres: number): Pin {
  const dLat = metres / METRES_PER_DEGREE
  const dLng = metres / (METRES_PER_DEGREE * Math.cos((pin.lat * Math.PI) / 180))
  switch (direction) {
    case 'north':
      return { lat: round6(pin.lat + dLat), lng: round6(pin.lng) }
    case 'south':
      return { lat: round6(pin.lat - dLat), lng: round6(pin.lng) }
    case 'east':
      return { lat: round6(pin.lat), lng: round6(pin.lng + dLng) }
    case 'west':
      return { lat: round6(pin.lat), lng: round6(pin.lng - dLng) }
  }
}

/** Google Maps' documented search link for a pin: opens the map with the pin dropped. */
export const mapsLink = (pin: Pin): string =>
  `https://www.google.com/maps/search/?api=1&query=${round6(pin.lat)},${round6(pin.lng)}`

/** The pin as the field shows it. */
export const pinText = (pin: Pin): string =>
  `${round6(pin.lat).toFixed(6)}, ${round6(pin.lng).toFixed(6)}`

/**
 * The geometry of assignment (COMMERCE.md §4): a buyer's pin, whether it is inside Indonesia, and
 * the straight-line distance from a store to it. Pure, so the nearest-store rule is unit-tested
 * without a database.
 *
 * "Inside Indonesia" is the same generous box the `stores_pin_in_indonesia` CHECK holds every store
 * to (`collections/stores/pin`): it catches a swapped, mistyped or foreign coordinate, not the
 * border. Anything past it is refused before a store is even looked at.
 */
import { INDONESIA_BOUNDS } from '../../collections/stores/pin'

/** A map pin in decimal degrees. */
export type Pin = { readonly lat: number; readonly lng: number }

/** The mean Earth radius (IUGG), km. */
const EARTH_RADIUS_KM = 6371.0088

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** A finite latitude and longitude on the globe — not yet a check that it is in Indonesia. */
export function isValidPin(pin: unknown): pin is Pin {
  if (typeof pin !== 'object' || pin === null) return false
  const { lat, lng } = pin as Record<string, unknown>
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

/** Inside the stores' own Indonesia box, bounds included (the CHECK uses BETWEEN). */
export function isInIndonesia(lat: number, lng: number): boolean {
  const { lat: la, lng: ln } = INDONESIA_BOUNDS
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= la.min &&
    lat <= la.max &&
    lng >= ln.min &&
    lng <= ln.max
  )
}

/** Great-circle (haversine) distance between two points, km, unrounded. */
export function haversineKm(a: Pin, b: Pin): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * A distance in whole tenths of a km, rounded UP (COMMERCE.md §4: "rounded up to 0.1 km"), with the
 * same float guard as the delivery bands (`shop/pricing/delivery`): 2.1 stays 21, 2.11 is 22.
 */
export function distanceTenths(km: number): number {
  return Math.ceil(Math.round(km * 10 * 1e6) / 1e6)
}

/** The distance as stored on the order and fed to the delivery fee: km to 0.1, rounded up. */
export function roundedDistanceKm(a: Pin, b: Pin): number {
  return distanceTenths(haversineKm(a, b)) / 10
}

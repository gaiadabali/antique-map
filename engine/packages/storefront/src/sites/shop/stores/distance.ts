/**
 * Nearby's arithmetic (the order of 2026-11-25): how far each store is from where the visitor
 * is, on the browser's own word for it. Pure, and run in the browser only: the visitor's
 * position is never sent anywhere.
 */
import type { Position } from '../../../server/shop/stores/group'

const EARTH_KM = 6371
const radians = (degrees: number) => (degrees * Math.PI) / 180

/** The great-circle distance between two points, in kilometres (haversine). */
export function distanceKm(from: Position, to: Position): number {
  const dLat = radians(to.lat - from.lat)
  const dLng = radians(to.lng - from.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The stores nearest first from `from`, each with its distance in kilometres; a store without a
 * position follows them, in the order it came. Ties keep their order.
 */
export function nearestFirst<T extends { readonly position: Position | null }>(
  stores: readonly T[],
  from: Position,
): readonly (T & { readonly km: number | null })[] {
  return stores
    .map((store, index) => ({
      store: { ...store, km: store.position ? distanceKm(from, store.position) : null },
      index,
    }))
    .sort((a, b) => {
      const gap = (a.store.km ?? Infinity) - (b.store.km ?? Infinity)
      return Number.isNaN(gap) || gap === 0 ? a.index - b.index : gap
    })
    .map(({ store }) => store)
}

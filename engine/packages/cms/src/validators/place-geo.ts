/**
 * A place's `geo { lat, lng, bbox }` (CONTENT-MODEL.md §3; C2 `PlaceVM.geo`): the point a locator
 * map pins (the item page's primary place) and the box a place page frames. Plain WGS 84
 * degrees — no PostGIS, which the database does not carry — so the shape is checked here.
 *
 * The box is `west, south, east, north`, GeoJSON's order. `west` may be greater than `east`: the
 * box then crosses the antimeridian — Australia–Pacific does (EXPERIENCE-GALLERY.md §2).
 */

export type Geo = {
  readonly lat?: number | null
  readonly lng?: number | null
  readonly bbox?: {
    readonly west?: number | null
    readonly south?: number | null
    readonly east?: number | null
    readonly north?: number | null
  } | null
}

type GeoPath = 'lat' | 'lng' | 'bbox.west' | 'bbox.south' | 'bbox.east' | 'bbox.north'
export type GeoErrors = Partial<Record<GeoPath, string>>

const present = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined

function rangeError(value: number, limit: 90 | 180, what: string): string | null {
  if (!Number.isFinite(value) || value < -limit || value > limit) {
    return `${what} is between -${limit} and ${limit} degrees.`
  }
  return null
}

/** Whether `lng` lies between `west` and `east`, across the antimeridian when `west > east`. */
export function withinLongitudes(lng: number, west: number, east: number): boolean {
  return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east
}

/** What is wrong with a place's geo, by field path — empty when nothing is. */
export function geoErrors(geo: Geo | null | undefined): GeoErrors {
  const errors: GeoErrors = {}
  const { lat, lng } = geo ?? {}
  const box = geo?.bbox ?? {}

  if (present(lat)) {
    const error = rangeError(lat, 90, 'Latitude')
    if (error) errors.lat = error
  }
  if (present(lng)) {
    const error = rangeError(lng, 180, 'Longitude')
    if (error) errors.lng = error
  }
  if (present(lat) !== present(lng)) {
    const missing = present(lat) ? 'lng' : 'lat'
    errors[missing] ??= 'A point needs both a latitude and a longitude.'
  }

  const sides = { west: box.west, south: box.south, east: box.east, north: box.north }
  const given = Object.values(sides).filter(present).length
  for (const side of ['west', 'east'] as const) {
    const value = sides[side]
    if (present(value)) {
      const error = rangeError(value, 180, `The ${side} edge`)
      if (error) errors[`bbox.${side}`] = error
    }
  }
  for (const side of ['south', 'north'] as const) {
    const value = sides[side]
    if (present(value)) {
      const error = rangeError(value, 90, `The ${side} edge`)
      if (error) errors[`bbox.${side}`] = error
    }
  }
  if (given > 0 && given < 4) {
    for (const side of ['west', 'south', 'east', 'north'] as const) {
      if (!present(sides[side])) errors[`bbox.${side}`] ??= 'A box needs all four edges.'
    }
    return errors
  }
  if (given === 4 && !errors['bbox.south'] && !errors['bbox.north']) {
    if (sides.south! >= sides.north!)
      errors['bbox.north'] = 'The north edge lies north of the south edge.'
    else if (sides.west === sides.east)
      errors['bbox.east'] = 'The east edge differs from the west edge.'
  }
  const boxValid = given === 4 && Object.keys(errors).every((path) => !path.startsWith('bbox.'))
  const pointValid = present(lat) && present(lng) && !errors.lat && !errors.lng
  if (boxValid && pointValid) {
    const inside =
      lat >= sides.south! && lat <= sides.north! && withinLongitudes(lng, sides.west!, sides.east!)
    if (!inside) errors.lat = 'The point lies outside the box: check both, or clear the box.'
  }
  return errors
}

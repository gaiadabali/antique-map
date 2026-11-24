/**
 * Where a store is, and when it must say (CONTENT-MODEL.md §4, §8): `lat`/`lng` are decimal
 * degrees inside Indonesia's bounds, and an **active** store — one an order can be assigned to
 * (COMMERCE.md §4: assignment measures from the store's pin) — has its address and pin. A store
 * the owner is still setting up is saved inactive with only its code and name.
 *
 * The same rules are CHECK constraints on `stores` (`./constraints`), so no write path — the
 * import, a seed, raw SQL — stores an active store without a pin, or a pin in the sea off Peru.
 */
import type { Validate } from 'payload'

/**
 * A box around Indonesia with a small margin: Sabang's 6.0 N to Rote's 11.0 S, Aceh's 95.0 E to
 * Merauke's 141.0 E. Generous on purpose: it catches a swapped or mistyped coordinate, not the
 * border.
 */
export const INDONESIA_BOUNDS = {
  lat: { min: -11.5, max: 6.5 },
  lng: { min: 94.5, max: 141.5 },
} as const

type Axis = keyof typeof INDONESIA_BOUNDS

type StoreSiblings = { active?: unknown } | undefined

const isActive = (siblingData: unknown) => (siblingData as StoreSiblings)?.active === true

const blank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

/** A coordinate on `axis`: a number inside the bounds, and present on an active store. */
export function validateCoordinate(axis: Axis): Validate<number | null | undefined> {
  const { min, max } = INDONESIA_BOUNDS[axis]
  const word = axis === 'lat' ? 'latitude' : 'longitude'
  return (value, { siblingData }) => {
    if (value === null || value === undefined) {
      return isActive(siblingData)
        ? `An active store needs its ${word}: orders are assigned by distance from it. Set it, or switch Active off.`
        : true
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) return `The ${word} is a number.`
    if (value < min || value > max) {
      return `That ${word} is outside Indonesia (${min} to ${max}). Check it was not swapped with the other coordinate.`
    }
    return true
  }
}

/** The street address: required on an active store, as the buyer's tracking page names it. */
export const validateAddress: Validate<string | null | undefined> = (value, { siblingData }) =>
  blank(value) && isActive(siblingData)
    ? 'An active store needs its address. Add it, or switch Active off.'
    : true

/** A WhatsApp number in E.164 (+62…), or none. */
export const validateWhatsApp: Validate<string | null | undefined> = (value) => {
  if (blank(value)) return true
  return /^\+[1-9]\d{7,14}$/.test(String(value).trim())
    ? true
    : 'Write the WhatsApp number in international form, starting with +62, digits only.'
}

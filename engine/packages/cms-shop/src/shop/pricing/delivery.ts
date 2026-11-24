/**
 * The delivery fee (TASKS.md 6.2.b; COMMERCE.md §5): the fee of the first band in
 * `site-settings.shop.delivery.bands` whose `upToKm` reaches the assigned store's distance, free when
 * the items subtotal after the discount reaches `freeOverIdr`. Beyond the last band there is no fee
 * because there is no delivery: the page offers a WhatsApp handoff instead.
 *
 * The bands are the owner's table in the admin (Q3). A table this module cannot trust — unordered,
 * a fractional fee, empty — is refused as a value (`no_delivery_table`), never guessed at, so a
 * mistyped band cannot under- or over-charge anyone.
 */
import { isIdr } from './money'

export type DeliveryBand = {
  /** The band's outer edge in km, straight line from the store; > 0, to 0.1 km. */
  readonly upToKm: number
  /** Whole rupiah, ≥ 0. */
  readonly feeIdr: number
}

export type DeliverySettings = {
  /** Strictly ascending by `upToKm`; the last band's `upToKm` is the delivery reach. */
  readonly bands: readonly DeliveryBand[]
  /** Free delivery from this items-after-discount amount; `null` means delivery is never free. */
  readonly freeOverIdr: number | null
}

export type DeliveryRefusal = 'beyond_reach' | 'no_delivery_table'

export type DeliveryFee =
  | {
      readonly ok: true
      /** 0 when free. */
      readonly feeIdr: number
      readonly isFree: boolean
      /** The band that applied: its fee is what is charged unless `isFree`. */
      readonly band: DeliveryBand
    }
  | { readonly ok: false; readonly refusal: DeliveryRefusal }

export type DeliveryTableCheck =
  | { readonly ok: true }
  | {
      readonly ok: false
      /** For the site-settings field validator: which band is wrong and why, in the admin's words. */
      readonly problem: 'empty' | 'distance' | 'order' | 'fee' | 'threshold'
      readonly index: number | null
    }

/** Kilometres in whole tenths, so `2.3` and `0.1 + 2.2` compare equal. */
const TENTH_EPSILON = 1e-6

function bandTenths(upToKm: number): number | null {
  if (typeof upToKm !== 'number' || !Number.isFinite(upToKm) || upToKm <= 0) return null
  const tenths = Math.round(upToKm * 10)
  return Math.abs(upToKm * 10 - tenths) < TENTH_EPSILON ? tenths : null
}

/**
 * A distance in whole tenths of a km, rounded UP (COMMERCE.md §4 rounds the haversine distance up to
 * 0.1 km): 2.11 km is 22 tenths, so it is never charged as if it were inside a 2.1 km band. `2.1`,
 * which is 21.000000000000004 tenths in floating point, stays 21.
 */
function distanceTenths(distanceKm: number): number {
  return Math.ceil(Math.round(distanceKm * 10 * 1e6) / 1e6)
}

/**
 * Checks the owner's table: at least one band; each `upToKm` > 0 to 0.1 km and strictly greater than
 * the one before; each fee a whole, non-negative rupiah amount; the threshold whole and non-negative
 * or unset. The site-settings global's validator can call this to refuse a bad table on save.
 */
export function checkDeliveryTable(settings: DeliverySettings): DeliveryTableCheck {
  const { bands, freeOverIdr } = settings
  if (freeOverIdr !== null && !isIdr(freeOverIdr))
    return { ok: false, problem: 'threshold', index: null }
  if (!Array.isArray(bands) || bands.length === 0)
    return { ok: false, problem: 'empty', index: null }
  let previous = 0
  for (const [index, band] of bands.entries()) {
    const tenths = bandTenths(band.upToKm)
    if (tenths === null) return { ok: false, problem: 'distance', index }
    if (tenths <= previous) return { ok: false, problem: 'order', index }
    if (!isIdr(band.feeIdr)) return { ok: false, problem: 'fee', index }
    previous = tenths
  }
  return { ok: true }
}

/**
 * The fee for delivering `distanceKm` from the assigned store. Exactly at the threshold is free;
 * exactly on a band's `upToKm` is inside that band; past the last band is `beyond_reach`.
 * `subtotalAfterDiscountIdr` is the items subtotal less the discount — the delivery fee is never
 * part of it (COMMERCE.md §5: the threshold is measured after the discount).
 *
 * Throws on a negative or non-finite distance or a non-integer subtotal: both are the server's own
 * figures, so either is a defect, not a visitor's input.
 */
export function deliveryFeeFor(
  distanceKm: number,
  bands: readonly DeliveryBand[],
  freeOverIdr: number | null,
  subtotalAfterDiscountIdr: number,
): DeliveryFee {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError(`distanceKm must be a finite number ≥ 0: ${distanceKm}`)
  }
  if (!isIdr(subtotalAfterDiscountIdr)) {
    throw new RangeError(
      `subtotalAfterDiscountIdr must be whole rupiah ≥ 0: ${subtotalAfterDiscountIdr}`,
    )
  }
  if (!checkDeliveryTable({ bands, freeOverIdr }).ok)
    return { ok: false, refusal: 'no_delivery_table' }

  const distance = distanceTenths(distanceKm)
  const band = bands.find((candidate) => distance <= (bandTenths(candidate.upToKm) as number))
  if (band === undefined) return { ok: false, refusal: 'beyond_reach' }

  const isFree = freeOverIdr !== null && subtotalAfterDiscountIdr >= freeOverIdr
  return { ok: true, feeIdr: isFree ? 0 : band.feeIdr, isFree, band }
}

/**
 * How much more the bag needs, after its discount, for free delivery — for "Rp 45.000 more for free
 * delivery". 0 once reached; `null` when delivery is never free.
 */
export function freeDeliveryRemainingIdr(
  freeOverIdr: number | null,
  subtotalAfterDiscountIdr: number,
): number | null {
  if (freeOverIdr === null || !isIdr(freeOverIdr)) return null
  return Math.max(0, freeOverIdr - subtotalAfterDiscountIdr)
}

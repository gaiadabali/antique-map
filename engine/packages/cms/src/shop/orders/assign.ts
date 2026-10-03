/**
 * Assignment — which store sends an order (TASKS.md 6.3.b; COMMERCE.md §4; Q4). Pure: the stores
 * and their stock come in as values (`./pick-store` reads them), so every rule is unit-tested.
 *
 * 1. The pin must be a real coordinate inside Indonesia (`./geo`) → else `invalid_pin` /
 *    `outside_indonesia`.
 * 2. The owner's delivery table must be one the fee code trusts → else `no_delivery_table`.
 * 3. Distance: haversine from each active store's pin, rounded UP to 0.1 km. A store past the last
 *    band's `upToKm` cannot deliver (`deliveryFeeFor` says `beyond_reach`). No active store within
 *    reach → `outside_reach` (WhatsApp offered): removing items would not help that buyer.
 * 4. A line no store within reach holds in full → `out_of_stock` naming those lines ("X just sold
 *    out"): it is not a question of which store.
 * 5. Of the stores within reach, those whose `quantity` covers **every** line in full, variant by
 *    variant. None → `no_single_store` — there are no split orders (Q4) — naming the lines the
 *    best-placed store lacks (the in-reach store holding the most lines, then the nearest, then
 *    the lowest code), so removing exactly those makes the bag fillable.
 * 6. The nearest wins. Ties (the same 0.1 km): the store holding more of the order's units, then
 *    the lower `code`. Deterministic: the same inputs always pick the same store.
 *
 * `missing` and `lines` name products and variants only — never a store's count (COMMERCE.md §10: store
 * stock is never shown).
 */
import { parseBagLines, type BagLine } from '../pricing/bag'
import { checkDeliveryTable, deliveryFeeFor, type DeliveryBand } from '../pricing/delivery'
import { distanceTenths, haversineKm, isInIndonesia, isValidPin, type Pin } from './geo'

/** An active store with its pin, as `./pick-store` reads it. */
export type StoreCandidate = {
  readonly id: number
  readonly code: string
  readonly name: string
  readonly area: string | null
  readonly lat: number
  readonly lng: number
}

/** One `stock-levels` row: what `storeId` can still sell of a product (and variant). */
export type StockRow = {
  readonly storeId: number
  readonly productId: number
  readonly variantSku: string | null
  readonly quantity: number
}

/** A bag line named without its quantity — what the buyer is asked to remove. */
export type LineRef = { readonly productId: number; readonly variantSku: string | null }

export type PickRefusalReason = PickRefusal['refusal']

export type PickedStore = {
  readonly ok: true
  readonly store: Pick<StoreCandidate, 'id' | 'code' | 'name' | 'area'>
  /** Straight line, km, rounded up to 0.1 — what the delivery fee is quoted on and the order stores. */
  readonly distanceKm: number
}

export type PickRefusal =
  | {
      readonly ok: false
      readonly refusal: 'invalid_pin' | 'outside_indonesia' | 'no_delivery_table' | 'outside_reach'
    }
  /** No store within reach holds these lines at all. */
  | { readonly ok: false; readonly refusal: 'out_of_stock'; readonly lines: readonly LineRef[] }
  /** Every line is held somewhere, but no one store holds them all: remove these, or ask. */
  | { readonly ok: false; readonly refusal: 'no_single_store'; readonly missing: readonly LineRef[] }

export type PickResult = PickedStore | PickRefusal

export type AssignInput = {
  readonly lines: readonly BagLine[]
  readonly pin: Pin
  readonly bands: readonly DeliveryBand[]
  readonly stores: readonly StoreCandidate[]
  readonly stock: readonly StockRow[]
}

const keyOf = (productId: number, variantSku: string | null) =>
  `${productId}\u0000${variantSku ?? ''}`

/** The key a line is unique by: one line per product and variant. */
export const lineKey = (line: LineRef): string => keyOf(line.productId, line.variantSku)

/**
 * The bag's lines, checked: the caller passes the quote's buyable lines, so a bad or empty list is
 * a defect in the caller, not a visitor's input.
 */
export function checkedLines(lines: readonly BagLine[]): BagLine[] {
  const clean = parseBagLines(lines)
  if (clean.length === 0 || clean.length !== lines.length) {
    throw new RangeError('assignment needs a non-empty list of valid, distinct bag lines')
  }
  return clean
}

type Placed = {
  readonly store: StoreCandidate
  readonly tenths: number
  /** Lines this store holds in full. */
  readonly held: number
  /** Units of the order's products it holds, for the tie-break. */
  readonly units: number
  readonly lacks: LineRef[]
}

const byCode = (a: Placed, b: Placed) =>
  a.store.code < b.store.code ? -1 : a.store.code > b.store.code ? 1 : 0

export function assignStore(input: AssignInput): PickResult {
  const lines = checkedLines(input.lines)
  const { pin, bands } = input
  if (!isValidPin(pin)) return { ok: false, refusal: 'invalid_pin' }
  if (!isInIndonesia(pin.lat, pin.lng)) return { ok: false, refusal: 'outside_indonesia' }
  if (!checkDeliveryTable({ bands, freeOverIdr: null }).ok) {
    return { ok: false, refusal: 'no_delivery_table' }
  }

  const quantity = new Map<string, number>()
  for (const row of input.stock) {
    quantity.set(`${row.storeId}\u0000${keyOf(row.productId, row.variantSku)}`, row.quantity)
  }
  const held = (storeId: number, line: LineRef) =>
    quantity.get(`${storeId}\u0000${keyOf(line.productId, line.variantSku)}`) ?? 0

  const inReach: Placed[] = []
  for (const store of input.stores) {
    if (!isInIndonesia(store.lat, store.lng)) continue
    const tenths = distanceTenths(haversineKm(store, pin))
    if (!deliveryFeeFor(tenths / 10, bands, null, 0).ok) continue
    const lacks = lines
      .filter((line) => held(store.id, line) < line.qty)
      .map(({ productId, variantSku }) => ({ productId, variantSku }))
    const units = lines.reduce((sum, line) => sum + held(store.id, line), 0)
    inReach.push({ store, tenths, held: lines.length - lacks.length, units, lacks })
  }
  if (inReach.length === 0) return { ok: false, refusal: 'outside_reach' }

  const soldOut = lines
    .filter((line) => inReach.every((placed) => held(placed.store.id, line) < line.qty))
    .map(({ productId, variantSku }) => ({ productId, variantSku }))
  if (soldOut.length > 0) return { ok: false, refusal: 'out_of_stock', lines: soldOut }

  const full = inReach.filter((placed) => placed.lacks.length === 0)
  if (full.length === 0) {
    const [best] = [...inReach].sort(
      (a, b) => b.held - a.held || a.tenths - b.tenths || byCode(a, b),
    )
    return { ok: false, refusal: 'no_single_store', missing: best!.lacks }
  }
  const [chosen] = full.sort((a, b) => a.tenths - b.tenths || b.units - a.units || byCode(a, b))
  const { id, code, name, area } = chosen!.store
  return { ok: true, store: { id, code, name, area }, distanceKm: chosen!.tenths / 10 }
}

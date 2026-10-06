/**
 * Order creation — one transaction (TASKS.md 6.3.c; COMMERCE.md §3–§4; SECURITY.md P1–P5).
 *
 * Before the transaction (Local API reads; none decides stock): the details are validated
 * (`./checkout-input`), the pin is refused outside Indonesia, the bag is re-read and re-priced
 * and the welcome code re-checked with the buyer's contact (`./prepare`), and the lines'
 * snapshots are read (`./inputs`).
 *
 * In ONE READ COMMITTED transaction with `lock_timeout` (`../payments/transaction`):
 *   1. pick the store on the transaction's own reads (`./pick-store`);
 *   2. quote the delivery fee from that store's distance (6.2's `quoteBag`) and compare the total
 *      with the one the buyer saw (`expectedTotalIdr`) — a difference creates nothing;
 *   3. take each line's stock in the lock order with `UPDATE … AND quantity >= n` — a line that
 *      updates no row rolls back every earlier decrement (`./order-sql`);
 *   4. count the code's use (`… used_count < usage_limit`) — a lost race refuses the code;
 *   5. draw the order number, make the tracking token (only its SHA-256 is stored) and write the
 *      order in `pending_payment` with its lines, totals exactly as quoted, the payment window
 *      (`orderExpiryMinutes`) and its first history entry.
 *
 * A line lost to another buyer between the pick and the decrement is retried ONCE on fresh counts
 * (COMMERCE.md §4); if that fails too, the buyer is told which item ran out. The bag is never
 * changed here.
 */
import type { Payload } from 'payload'

import type { BagCookieKey, BagLine } from '../pricing/bag'
import { DISCOUNT_MESSAGE_KEYS, type DiscountRefusal } from '../pricing/discount'
import { quoteBag } from '../pricing/quote'
import { notifyOrderEvent } from '../notify'
import { inTransaction, type Tx } from '../payments/transaction'
import { lineKey, type LineRef, type PickRefusal } from './assign'
import {
  validateCheckoutDetails,
  type CheckoutDetails,
  type CheckoutDetailsInput,
  type CheckoutField,
} from './checkout-input'
import { isInIndonesia } from './geo'
import { loadProductSnapshots, type ProductSnapshot } from './inputs'
import { orderLinkKeyFromEnv, sealToken } from './link-key'
import {
  claimDiscount,
  inLockOrder,
  insertOrder,
  newTrackingToken,
  nextOrderNumber,
  takeStock,
  type OrderLineRecord,
} from './order-sql'
import { pickStore } from './pick-store'
import { prepareBag, type PreparedBag, type PrepareRefusal } from './prepare'

export type CreateOrderRequest = {
  /** The `cart` cookie's raw value: the only source of lines and quantities. */
  readonly bagCookie: string | null | undefined
  readonly details: CheckoutDetailsInput
  /** The code the buyer typed, or nothing. */
  readonly welcomeCode?: string | null
  /**
   * The total the review step showed, for comparison only (never read as a price). The pay button
   * MUST send it; `null` skips the comparison (server-side callers and tests).
   */
  readonly expectedTotalIdr: number | null
}

export type CreateOrderOptions = {
  /** `bagCookieKeyFromEnv()`. */
  readonly bagKey: BagCookieKey
  /** The clock; tests pass one. */
  readonly now?: Date
}

/** Whole rupiah, as stored on the order. */
export type OrderTotals = {
  readonly subtotalIdr: number
  readonly discountIdr: number
  /** `null` until the quote move sets it (TASKS.md 6.6): staff price delivery after placement. */
  readonly deliveryIdr: number | null
  /** `subtotalIdr − discountIdr` until a fee is quoted; `+ deliveryIdr` once it is. */
  readonly totalIdr: number
}

export type CreatedOrder = {
  readonly ok: true
  readonly orderId: number
  readonly number: number
  /** Returned ONCE, for the tracking link; the database holds only its SHA-256. */
  readonly trackingToken: string
  readonly totals: OrderTotals
  /** The end of the payment window. */
  readonly expiresAt: Date
}

export type OrderRefusal =
  | {
      readonly ok: false
      readonly refusal: 'invalid_details'
      readonly fields: readonly CheckoutField[]
    }
  | PrepareRefusal
  | PickRefusal
  | { readonly ok: false; readonly refusal: 'price_changed'; readonly totals: OrderTotals }

export type CreateOrderResult = CreatedOrder | OrderRefusal

/** A refusal thrown inside the transaction so that everything it did rolls back. */
class Refused extends Error {
  constructor(
    readonly result: OrderRefusal,
    /** The decrement lost a race: the order may be tried once more on fresh counts. */
    readonly retry = false,
  ) {
    super(`order refused: ${result.refusal}`)
  }
}

const outOfStock = (lines: readonly LineRef[]): OrderRefusal => ({
  ok: false,
  refusal: 'out_of_stock',
  lines: lines.map(({ productId, variantSku }) => ({ productId, variantSku })),
})

const codeRefused = (reason: 'usage_limit' | 'already_used'): OrderRefusal => {
  const code: DiscountRefusal = { reason, messageKey: DISCOUNT_MESSAGE_KEYS[reason] }
  return { ok: false, refusal: 'code_refused', code }
}

/** The order's lines with what each was sold as; `null` if a product left the shop meanwhile. */
function snapshotLines(
  prepared: PreparedBag,
  snapshots: ReadonlyMap<number, ProductSnapshot>,
): { lines: Omit<OrderLineRecord, 'unitIdr' | 'lineIdr'>[]; gone: LineRef[] } {
  const lines: Omit<OrderLineRecord, 'unitIdr' | 'lineIdr'>[] = []
  const gone: LineRef[] = []
  for (const line of prepared.lines) {
    const product = snapshots.get(line.productId)
    const label = line.variantSku === null ? null : product?.variantLabels.get(line.variantSku)
    if (!product || label === undefined) {
      gone.push(line)
      continue
    }
    const sku = line.variantSku ?? product.sku
    lines.push({ ...line, sku, name: product.name, variantLabel: label, imageId: product.imageId })
  }
  return { lines, gone }
}

type Placement = {
  readonly prepared: PreparedBag
  readonly details: CheckoutDetails
  readonly snapshots: readonly Omit<OrderLineRecord, 'unitIdr' | 'lineIdr'>[]
  readonly expectedTotalIdr: number | null
  readonly at: Date
}

async function placeOrder(tx: Tx, placement: Placement): Promise<CreatedOrder> {
  const { prepared, details, at } = placement
  const lines: readonly BagLine[] = prepared.lines
  const pick = await pickStore(tx, { lines, pin: details.delivery })
  if (!pick.ok) throw new Refused(pick)

  // No delivery quote yet (TASKS.md 6.6): staff price it after placement, so `distanceKm` is never
  // given to the bag's pricer here — `quote.deliveryIdr` comes back `null`, and the total excludes it.
  const quote = quoteBag(lines, prepared.catalogue, prepared.settings, {
    distanceKm: null,
    discount: prepared.discount,
  })
  if (quote.refusal !== undefined || quote.lines.some((l) => l.status !== 'ok')) {
    throw new Error(`orders: the quote of buyable lines failed (${quote.refusal ?? 'a line'})`)
  }
  const totals: OrderTotals = {
    subtotalIdr: quote.subtotalIdr,
    discountIdr: quote.discountIdr,
    deliveryIdr: null,
    totalIdr: quote.totalIdr,
  }
  if (placement.expectedTotalIdr !== null && placement.expectedTotalIdr !== totals.totalIdr) {
    throw new Refused({ ok: false, refusal: 'price_changed', totals })
  }

  for (const line of await inLockOrder(tx, lines)) {
    if (!(await takeStock(tx, pick.store.id, line, at))) throw new Refused(outOfStock([line]), true)
  }
  if (quote.discount !== null) {
    const claim = await claimDiscount(tx, quote.discount.code, details.contact, at)
    if (claim !== 'claimed') throw new Refused(codeRefused(claim))
  }

  const priced = new Map(quote.lines.map((line) => [lineKey(line), line]))
  const number = await nextOrderNumber(tx)
  const { token, hash } = newTrackingToken()
  const sealed = sealToken(token, orderLinkKeyFromEnv())
  const expiresAt = new Date(at.getTime() + prepared.orderSettings.quoteWindowMinutes * 60_000)
  const orderId = await insertOrder(tx, {
    number,
    contact: details.contact,
    delivery: details.delivery,
    giftNote: details.giftNote,
    store: pick.store,
    distanceKm: pick.distanceKm,
    totals,
    discount: quote.discount,
    lines: placement.snapshots.map((line) => {
      const { unitIdr, lineIdr } = priced.get(lineKey(line))!
      return { ...line, unitIdr: unitIdr!, lineIdr }
    }),
    trackingTokenHash: hash,
    trackingTokenEnc: sealed,
    expiresAt,
    at,
  })
  return { ok: true, orderId, number, trackingToken: token, totals, expiresAt }
}

/** Creates the order for the bag in `request.bagCookie`, or says why not. See the file header. */
export async function createOrder(
  payload: Payload,
  request: CreateOrderRequest,
  options: CreateOrderOptions,
): Promise<CreateOrderResult> {
  const at = options.now ?? new Date()
  const checked = validateCheckoutDetails(request.details)
  if (!checked.ok) return { ok: false, refusal: 'invalid_details', fields: checked.fields }
  const { details } = checked
  if (!isInIndonesia(details.delivery.lat, details.delivery.lng)) {
    return { ok: false, refusal: 'outside_indonesia' }
  }

  const prepared = await prepareBag(payload, {
    bagCookie: request.bagCookie,
    bagKey: options.bagKey,
    welcomeCode: request.welcomeCode,
    contact: details.contact,
    now: at,
  })
  if (!prepared.ok) return prepared
  const ids = prepared.lines.map((line) => line.productId)
  const snapshots = snapshotLines(
    prepared,
    await loadProductSnapshots(payload, ids, details.contact.locale),
  )
  if (snapshots.gone.length > 0) return outOfStock(snapshots.gone)

  const placement = {
    prepared,
    details,
    snapshots: snapshots.lines,
    at,
    expectedTotalIdr: request.expectedTotalIdr,
  }
  for (const attempt of [1, 2] as const) {
    try {
      const created = await inTransaction(payload, (tx) => placeOrder(tx, placement))
      // After commit (TASKS.md 6.6, orchestrator decision B): "we're confirming your delivery
      // price". Best-effort: `notifyOrderEvent` never throws, but a defect here must not undo
      // the order the buyer already has.
      await notifyOrderEvent(payload, {
        orderId: created.orderId,
        from: null,
        to: 'awaiting_quote',
      }).catch(() => {})
      return created
    } catch (error) {
      if (!(error instanceof Refused)) throw error
      // A unit lost to another buyer between the pick and the decrement: once more, fresh counts.
      if (error.retry && attempt === 1) continue
      return error.result
    }
  }
  throw new Error('orders: unreachable')
}

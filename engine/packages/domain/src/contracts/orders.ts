/**
 * @contract C6 Commerce API — an order as its buyer reads it · owner: ARC · via `@engine/domain/api`
 *
 * What every buyer-facing answer says of an order — a lookup, a checkout's or a pay link's order,
 * the payment poll — and what the order page's loader builds on (C2 `OrderVM`, `OrderSummaryVM`).
 * Two rules. Lines are the order's SNAPSHOTS (CONVENTIONS.md §3): title, image, options and price
 * as sold, so an order reads correctly after its product is edited, unpublished or deleted. And a
 * buyer reads a status derived for them (`BuyerOrderStatus`), never the order's or its payments'
 * machine states: a dispute, a refused duplicate or an attempt the order no longer uses is staff's.
 */
import type { Money } from '../money/contract'
import type { PaymentStatus } from '../payment/machine'
import type { SellerIdentity } from './checkout'
import type { ProductPublicId, VariantId } from './requests'
import type { PricedTotals } from './results'
import type { IsoInstant } from './scalars'
import type { Assert, Equals } from './type-assertions'

/** A stored order's figures as the buyer reads them: no token, because nothing is committed. */
export type OrderTotalsView = Omit<PricedTotals, 'token'>

/** A courier's progress, normalised across carriers (C7 shipping events map onto it). */
export type ShipmentStatus =
  | 'label-created'
  | 'ready-for-pickup'
  | 'picked-up'
  | 'in-transit'
  | 'out-for-delivery'
  | 'delivered'
  | 'collected'
  | 'exception'
  | 'returned-to-sender'

/**
 * How the buyer-facing status reads a shipment — a partition of `ShipmentStatus`, proved total
 * below: on its way (it has left, whatever became of it since), at a pickup, or not yet gone.
 */
export type ShipmentOnItsWay = Exclude<
  ShipmentStatus,
  'label-created' | 'ready-for-pickup' | 'collected'
>
export type ShipmentAtPickup = Extract<ShipmentStatus, 'ready-for-pickup' | 'collected'>
export type ShipmentNotYetGone = Extract<ShipmentStatus, 'label-created'>

export type ShipmentView = {
  readonly carrier: string | null
  readonly service: string | null
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly status: ShipmentStatus
  readonly events: readonly {
    readonly at: IsoInstant
    readonly status: ShipmentStatus
    readonly description: string
  }[]
  /** A pickup's collection code (also shown as a QR). */
  readonly pickupCode: string | null
}

/** A configurator choice as sold: the ids a reorder copies, and the label the buyer read. */
export type OrderedOption = {
  readonly axis: string
  readonly value: string
  /** In the language the order was placed in, as it read then ("Natural teak"). */
  readonly label: string
}

/**
 * The image a line was sold with, by its C9 content address (`AssetId`, 32 hex characters) —
 * never a URL, which a new derivative version would leave behind: the loader builds the current
 * derivatives from it (C2 `ImageVM`), and the snapshot keeps the alt text it had.
 */
export type OrderedImage = {
  readonly assetId: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

/**
 * A line as the order snapshotted it, whatever changed since. `productId` and `variantId` name
 * what was sold — a link while the product is still published, and what a partner's reorder
 * copies (`quote.reorder`) — never a way to re-read its title or its price.
 */
export type OrderedLineView = {
  readonly lineId: string
  readonly productId: ProductPublicId
  readonly variantId: VariantId | null
  readonly title: string
  /** `M.0001` — also the WhatsApp reference. */
  readonly stockNumber: string | null
  /** Always true for reproductions and merchandise: the label is never optional. */
  readonly isReproduction: boolean
  readonly image: OrderedImage | null
  readonly options: readonly OrderedOption[]
  readonly quantity: number
  readonly unitPrice: Money
  readonly total: Money
}

/** An ordered line (as snapshotted), and whether a return can be asked for it. */
export type OrderLineView = OrderedLineView & { readonly returnable: boolean }

/**
 * An order's standing as its buyer reads it: one pure function, for a C6 answer and a C2 loader
 * alike, of the order's status (C8), the attempt that paid it (before one has, the latest) and its
 * shipments — total over all three. Whatever the stage, first:
 * - `cancelled` — the order is cancelled (a refund after payment shows in the payment's part);
 * - `refunded` — that attempt is refunded in full (a late payment refused reads so too).
 * Otherwise, by the order's status:
 * - `pending_payment` → `awaiting-payment`, whatever its attempt is doing: a failed or expired
 *   attempt is the page's retry state, never the order's;
 * - `abandoned` → `not-paid`: the money never came, and the items went back on sale;
 * - `paid` → `paid`: nothing has left yet;
 * - `fulfilling` → `shipped` when any shipment is `ShipmentOnItsWay` (a delivery exception and a
 *   return to sender included: it did leave); else `ready-for-pickup` when a shipment's status is
 *   `ready-for-pickup` itself — of `ShipmentAtPickup`, only that: a `collected` one has gone to its
 *   buyer; else `paid` (labels printed, or a pickup collected while another line waits);
 * - `completed` → `completed`.
 * An order with nothing to ship — a digital gift card — takes the same rows: `paid` until its last
 * card is sent, when C8 completes it. A dispute, won or lost, changes nothing a buyer reads (the
 * order stands, staff are alerted), and a partial refund keeps the stage, shown in the payment's
 * part.
 */
export type BuyerOrderStatus =
  | 'awaiting-payment'
  | 'not-paid'
  | 'paid'
  | 'shipped'
  | 'ready-for-pickup'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type OrderSummaryView = {
  readonly number: string
  readonly placedAt: IsoInstant
  readonly status: BuyerOrderStatus
  readonly seller: SellerIdentity
  readonly lines: readonly OrderLineView[]
  readonly totals: OrderTotalsView
  readonly shipments: readonly ShipmentView[]
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// A buyer never reads a dispute, and an order summary carries no payment machine state at all.
type _NoDisputeForTheBuyer = Assert<
  Equals<Extract<BuyerOrderStatus, Extract<PaymentStatus, `dispute${string}`>>, never>
>
type _NoAttemptStateOnTheSummary = Assert<Equals<Extract<keyof OrderSummaryView, 'payment'>, never>>
// Every courier status falls in exactly one of the three the status reads.
type _ShipmentsPartitioned = Assert<
  Equals<ShipmentOnItsWay | ShipmentAtPickup | ShipmentNotYetGone, ShipmentStatus>
>
type _PartsDisjoint = Assert<
  Equals<Extract<ShipmentOnItsWay, ShipmentAtPickup | ShipmentNotYetGone>, never>
>

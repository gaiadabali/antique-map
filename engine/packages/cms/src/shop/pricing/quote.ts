/**
 * Pricing a bag (TASKS.md 6.2.a; COMMERCE.md §2; SECURITY.md P1–P3). The one function the bag page,
 * each checkout step and order creation call to turn bag lines into money:
 *
 *   subtotal = Σ unitPrice × qty         (lines that can be bought only)
 *   discount = applyDiscount(subtotal)   (the ONE rounding: a percentage, half-up, on the subtotal)
 *   delivery = deliveryFeeFor(distance, bands, freeOver, subtotal − discount)
 *   total    = subtotal − discount + delivery
 *
 * Every price comes from `catalogue` — the server's own read of `products` — and nothing else. A
 * line carries ids and a quantity; anything a request adds beside them is dropped by `parseBagLines`
 * before a number is read, so a tampered price cannot reach this file.
 */
import { parseBagLines, type BagLine } from './bag'
import {
  deliveryFeeFor,
  freeDeliveryRemainingIdr,
  type DeliveryRefusal,
  type DeliverySettings,
} from './delivery'
import { applyDiscount, type DiscountRefusal, type EligibleDiscount } from './discount'
import { assertIdr, isPriceIdr } from './money'

/** One variant as the server read it (CONTENT-MODEL.md §3 `products.variants`). */
export type CatalogueVariant = {
  readonly sku: string
  /** The variant's own price, or `null` to take the product's. */
  readonly priceIdr: number | null
  readonly active: boolean
  /** Some active store holds at least one (COMMERCE.md §4; which stores is 6.3's question). */
  readonly inStock: boolean
}

/** One published product as the server read it. */
export type CatalogueProduct = {
  readonly productId: number
  /** `products.price`: whole rupiah > 0. */
  readonly priceIdr: number
  /** For a product without variants: some active store holds at least one. Ignored otherwise. */
  readonly inStock: boolean
  /** Empty for a product without variants; then a line's `variantSku` must be `null`. */
  readonly variants: readonly CatalogueVariant[]
}

/** The published products a bag's lines name, by id. A product missing here is not for sale. */
export type Catalogue = ReadonlyMap<number, CatalogueProduct>

export type PricingSettings = { readonly delivery: DeliverySettings }

export type QuoteOptions = {
  /**
   * Straight-line km from the assigned store to the pin (6.3.b's `pickStore`); `null` before a pin
   * exists — the bag page — in which case `deliveryIdr` is `null` and the total excludes delivery.
   */
  readonly distanceKm: number | null
  /** From `checkWelcomeCode`; `null` when no code was entered or it was refused. */
  readonly discount: EligibleDiscount | null
}

/**
 * - `ok` — priced and counted in the subtotal.
 * - `out_of_stock` — priced, shown as "Out of stock", left out of the subtotal and of checkout.
 * - `unavailable` — not for sale: an unknown or unpublished product, an inactive or unknown variant,
 *   a variant missing on a product that has variants (or given on one that has none), or a price
 *   the server cannot trust. Left out; the page offers to remove it.
 */
export type QuoteLineStatus = 'ok' | 'out_of_stock' | 'unavailable'

export type QuoteLine = {
  readonly productId: number
  readonly variantSku: string | null
  readonly qty: number
  readonly status: QuoteLineStatus
  /** The server's unit price; `null` when `unavailable`. */
  readonly unitIdr: number | null
  /** `unitIdr × qty` when `ok`; 0 otherwise. */
  readonly lineIdr: number
}

/**
 * Why the bag cannot go to payment as it stands. `empty_bag`: no lines. `out_of_stock`: lines, but
 * none can be bought. `beyond_reach`: the pin is past the last delivery band (offer WhatsApp).
 * `no_delivery_table`: the owner's fee table is missing or invalid (offer WhatsApp; alert staff).
 */
export type QuoteRefusal = 'empty_bag' | 'out_of_stock' | DeliveryRefusal

export type Quote = {
  /** In the bag's order, one per bag line. */
  readonly lines: readonly QuoteLine[]
  readonly subtotalIdr: number
  /** The code applied, for the order's `discount { code, kind, value }` snapshot; `null` if none. */
  readonly discount: {
    readonly code: string
    readonly kind: 'percent' | 'fixed'
    readonly value: number
  } | null
  readonly discountIdr: number
  /** Set when a code was given but the bag does not meet it (today: the minimum spend). */
  readonly discountRefusal: DiscountRefusal | null
  /** `null` while there is no distance, or when delivery is refused. */
  readonly deliveryIdr: number | null
  readonly isFreeDelivery: boolean
  /** Rupiah still to add for free delivery (0 once reached); `null` when delivery is never free. */
  readonly freeDeliveryRemainingIdr: number | null
  /** `subtotalIdr − discountIdr + (deliveryIdr ?? 0)`. */
  readonly totalIdr: number
  /** Absent when the bag can go to payment (given a distance). */
  readonly refusal?: QuoteRefusal
}

function priceLine(line: BagLine, catalogue: Catalogue): QuoteLine {
  const unavailable = { ...line, status: 'unavailable' as const, unitIdr: null, lineIdr: 0 }
  const product = catalogue.get(line.productId)
  if (product === undefined || !isPriceIdr(product.priceIdr)) return unavailable

  let unitIdr: number
  let inStock: boolean
  if (product.variants.length === 0) {
    if (line.variantSku !== null) return unavailable
    unitIdr = product.priceIdr
    inStock = product.inStock
  } else {
    const variant = product.variants.find((candidate) => candidate.sku === line.variantSku)
    if (line.variantSku === null || variant === undefined || variant.active !== true)
      return unavailable
    // A variant without its own price takes the product's (CONTENT-MODEL.md §3).
    const price = variant.priceIdr ?? product.priceIdr
    if (!isPriceIdr(price)) return unavailable
    unitIdr = price
    inStock = variant.inStock
  }
  if (inStock !== true) return { ...line, status: 'out_of_stock', unitIdr, lineIdr: 0 }
  return { ...line, status: 'ok', unitIdr, lineIdr: assertIdr(unitIdr * line.qty, 'line total') }
}

/**
 * Prices `lines` against `catalogue` and `settings`. Pure and synchronous: the database reads happen
 * before (`payload-adapter.ts`), the code check before that (`checkWelcomeCode`). `lines` are
 * re-validated, so a caller that passes a request's lines straight through still cannot smuggle in
 * a quantity out of range: an invalid bag prices as the empty bag.
 */
export function quoteBag(
  lines: readonly BagLine[],
  catalogue: Catalogue,
  settings: PricingSettings,
  opts: QuoteOptions,
): Quote {
  const bag = parseBagLines(lines)
  const quoted = bag.map((line) => priceLine(line, catalogue))
  const subtotalIdr = assertIdr(
    quoted.reduce((sum, line) => sum + line.lineIdr, 0),
    'subtotal',
  )

  let discountIdr = 0
  let discountRefusal: DiscountRefusal | null = null
  let discount: Quote['discount'] = null
  if (opts.discount !== null && subtotalIdr > 0) {
    const applied = applyDiscount(opts.discount, subtotalIdr)
    if (applied.ok) {
      discountIdr = assertIdr(applied.discountIdr, 'discount')
      discount = { code: opts.discount.code, kind: opts.discount.kind, value: opts.discount.value }
    } else {
      discountRefusal = applied.refusal
    }
  }
  const afterDiscountIdr = assertIdr(subtotalIdr - discountIdr, 'subtotal after discount')
  const { bands, freeOverIdr } = settings.delivery

  let deliveryIdr: number | null = null
  let isFreeDelivery = false
  let deliveryRefusal: DeliveryRefusal | undefined
  if (opts.distanceKm !== null && subtotalIdr > 0) {
    const fee = deliveryFeeFor(opts.distanceKm, bands, freeOverIdr, afterDiscountIdr)
    if (fee.ok) {
      deliveryIdr = fee.feeIdr
      isFreeDelivery = fee.isFree
    } else {
      deliveryRefusal = fee.refusal
    }
  }

  const refusal: QuoteRefusal | undefined =
    bag.length === 0 ? 'empty_bag' : subtotalIdr === 0 ? 'out_of_stock' : deliveryRefusal
  const quote: Quote = {
    lines: quoted,
    subtotalIdr,
    discount,
    discountIdr,
    discountRefusal,
    deliveryIdr,
    isFreeDelivery,
    freeDeliveryRemainingIdr:
      subtotalIdr > 0 ? freeDeliveryRemainingIdr(freeOverIdr, afterDiscountIdr) : null,
    totalIdr: assertIdr(afterDiscountIdr + (deliveryIdr ?? 0), 'total'),
  }
  return refusal === undefined ? quote : { ...quote, refusal }
}

/** The lines checkout and order creation take: the ones the quote counted. */
export function buyableLines(quote: Quote): BagLine[] {
  return quote.lines
    .filter((line) => line.status === 'ok')
    .map(({ productId, variantSku, qty }) => ({ productId, variantSku, qty }))
}

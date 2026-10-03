/**
 * The order code's reads through the Local API, made before its transaction opens (a Local API
 * call inside it would take a second pool connection while holding the first): the checkout
 * settings, the welcome discount's record, and what each line is snapshotted with (COMMERCE.md
 * §1.4 "Snapshots, not references").
 *
 * None of these decide stock. Prices come from `loadPricingInputs` (6.2), the stock from the
 * transaction itself (`./pick-store`, `./order-sql`). Never cached: they decide a purchase.
 *
 * `site-settings` and `discounts` are staff data, read with `overrideAccess: true` and a `select`
 * of exactly the fields used; `products` is read as the public reads it (`overrideAccess: false`,
 * published only).
 */
import type { Payload } from 'payload'

import type { DiscountRecord } from '../pricing/discount'
import { normaliseDiscountCode } from '../pricing/discount'
import { DEFAULT_WINDOW_MINUTES } from '../payments/order-sql'

export type OrderSettings = {
  /** `site-settings.shop.checkoutEnabled`; off → checkout offers WhatsApp. */
  readonly checkoutEnabled: boolean
  /** The payment window (COMMERCE.md §4, Open: default 60). */
  readonly orderExpiryMinutes: number
  /** The code `site-settings.shop.welcomeDiscount` names, normalised, or `null`. */
  readonly welcomeCode: string | null
}

export async function loadOrderSettings(payload: Payload): Promise<OrderSettings> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    select: { shop: { checkoutEnabled: true, orderExpiryMinutes: true, welcomeDiscount: true } },
    depth: 0,
    overrideAccess: true,
  })
  const shop = (settings as { shop?: Record<string, unknown> | null }).shop ?? {}
  const minutes = shop.orderExpiryMinutes
  const named = shop.welcomeDiscount
  return {
    checkoutEnabled: shop.checkoutEnabled !== false,
    orderExpiryMinutes:
      typeof minutes === 'number' && Number.isSafeInteger(minutes) && minutes >= 1
        ? minutes
        : DEFAULT_WINDOW_MINUTES,
    // A code today (a text field); a relationship to `discounts` later reads its `code`.
    welcomeCode: normaliseDiscountCode(
      typeof named === 'object' && named !== null ? (named as { code?: unknown }).code : named,
    ),
  }
}

const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : null)
const dateOrNull = (value: unknown) => (typeof value === 'string' ? value : null)

/**
 * The `discounts` record the welcome code names, as `checkWelcomeCode` takes it, or `null` when the
 * site names none or the record is missing.
 */
export async function loadWelcomeDiscount(
  payload: Payload,
  welcomeCode: string | null,
): Promise<DiscountRecord | null> {
  if (welcomeCode === null) return null
  const { docs } = await payload.find({
    collection: 'discounts',
    where: { code: { equals: welcomeCode } },
    select: {
      code: true,
      kind: true,
      value: true,
      minSpend: true,
      oncePerBuyer: true,
      startsAt: true,
      endsAt: true,
      usageLimit: true,
      usedCount: true,
      active: true,
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const doc = docs[0] as Record<string, unknown> | undefined
  if (!doc || typeof doc.code !== 'string' || (doc.kind !== 'percent' && doc.kind !== 'fixed')) {
    return null
  }
  return {
    code: doc.code,
    kind: doc.kind,
    value: numberOrNull(doc.value) ?? Number.NaN,
    minSpendIdr: numberOrNull(doc.minSpend),
    oncePerBuyer: doc.oncePerBuyer === true,
    startsAt: dateOrNull(doc.startsAt),
    endsAt: dateOrNull(doc.endsAt),
    usageLimit: numberOrNull(doc.usageLimit),
    usedCount: numberOrNull(doc.usedCount) ?? 0,
    active: doc.active === true,
  }
}

/** What an order line keeps of its product (CONTENT-MODEL.md §4 `orders.lines`). */
export type ProductSnapshot = {
  readonly sku: string
  readonly name: string
  /** The first image's `media` id, or `null`. */
  readonly imageId: number | null
  /** Variant SKU → its label in the buyer's language (falling back to English). */
  readonly variantLabels: ReadonlyMap<string, string | null>
}

const LIMITS = { sku: 64, name: 160, variantLabel: 80 } as const

/** The selected fields of a product, as `find` returns them at depth 0. */
type SnapshotDoc = {
  id: number
  sku: string
  name?: string | null
  images?: Array<{ image: number | { id: number } }> | null
  variants?: Array<{ sku: string; label?: string | null }> | null
}

/** The published products' snapshots, in the buyer's language, by product id. */
export async function loadProductSnapshots(
  payload: Payload,
  productIds: readonly number[],
  locale: 'en' | 'id',
): Promise<ReadonlyMap<number, ProductSnapshot>> {
  const { docs } = await payload.find({
    collection: 'products',
    where: {
      and: [{ id: { in: [...new Set(productIds)] } }, { _status: { equals: 'published' } }],
    },
    select: { sku: true, name: true, images: true, variants: true },
    locale,
    fallbackLocale: 'en',
    depth: 0,
    pagination: false,
    overrideAccess: false,
  })
  const snapshots = new Map<number, ProductSnapshot>()
  for (const doc of docs as unknown as SnapshotDoc[]) {
    const image = doc.images?.[0]?.image
    snapshots.set(doc.id, {
      sku: String(doc.sku).slice(0, LIMITS.sku),
      name: (doc.name || doc.sku).slice(0, LIMITS.name),
      imageId: typeof image === 'number' ? image : (image?.id ?? null),
      variantLabels: new Map(
        (doc.variants ?? []).map((variant) => [
          variant.sku,
          variant.label ? variant.label.slice(0, LIMITS.variantLabel) : null,
        ]),
      ),
    })
  }
  return snapshots
}

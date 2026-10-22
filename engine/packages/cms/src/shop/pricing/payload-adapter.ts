/**
 * The pricing core's only database reads (TASKS.md 6.2): turns a Payload instance into the narrow
 * inputs `quoteBag` and `checkWelcomeCode` take. Kept thin so everything that decides money stays
 * pure and unit-tested.
 *
 * UNTESTED until `products`, `stock-levels`, `discounts`, `orders` and the `site-settings` global
 * merge (3.x, 6.3): written against CONTENT-MODEL.md §3, §4 and §6's field names, through a loose
 * view of the Local API because those slugs are not in `payload-types.ts` yet. When they land,
 * replace `loose()` with the typed calls and add a `*.db.test.ts` for this file.
 *
 * These reads decide a purchase, so they are never cached (ARCHITECTURE.md §6). `products` is read
 * as the public would read it (`overrideAccess: false`, published only). `stock-levels`, `stores`,
 * `discounts`, `orders` and `site-settings` are staff data no visitor may read, so they are read with
 * `overrideAccess: true` and a `select` of exactly the fields used — and none of it leaves the server
 * except as the figures `quoteBag` computes from it.
 */
import type { Payload } from 'payload'

import type { BagLine } from './bag'
import type { DeliveryBand } from './delivery'
import type { DiscountContact, DiscountRecord, HasBeenUsedBy } from './discount'
import type { Catalogue, CatalogueProduct, PricingSettings } from './quote'

export type PricingInputs = {
  readonly catalogue: Catalogue
  readonly settings: PricingSettings
  /** The discount `site-settings.shop.welcomeDiscount` names, or `null`. */
  readonly welcome: DiscountRecord | null
}

type Doc = Record<string, unknown>
type LooseFind = (args: {
  collection: string
  where: Doc
  select: Doc
  depth: number
  pagination: false
  limit?: number
  overrideAccess: boolean
}) => Promise<{ docs: Doc[] }>
type LooseFindGlobal = (args: {
  slug: string
  select: Doc
  depth: number
  overrideAccess: boolean
}) => Promise<Doc>

// TODO(3.x, 6.3): drop once the collections are in payload-types.ts.
function loose(payload: Payload): { find: LooseFind; findGlobal: LooseFindGlobal } {
  return {
    find: payload.find.bind(payload) as unknown as LooseFind,
    findGlobal: payload.findGlobal.bind(payload) as unknown as LooseFindGlobal,
  }
}

const asDoc = (value: unknown): Doc =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Doc) : {}
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const asNumberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const idOf = (value: unknown): number | null =>
  typeof value === 'number' ? value : asNumberOrNull(asDoc(value).id)

/** The statuses that count as a paid order for `oncePerBuyer` (COMMERCE.md §5, §7). */
export const PAID_ORDER_STATUSES = [
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
  'delivered',
] as const

async function loadCatalogue(payload: Payload, lines: readonly BagLine[]): Promise<Catalogue> {
  const ids = [...new Set(lines.map((line) => line.productId))]
  if (ids.length === 0) return new Map()
  const { find } = loose(payload)
  const [products, stores] = await Promise.all([
    find({
      collection: 'products',
      where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
      select: { price: true, variants: true },
      depth: 0,
      pagination: false,
      overrideAccess: false,
    }),
    find({
      collection: 'stores',
      where: { active: { equals: true } },
      select: { id: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const storeIds = stores.docs.map((store) => idOf(store)).filter((id) => id !== null)
  const stock =
    storeIds.length === 0
      ? { docs: [] }
      : await find({
          collection: 'stock-levels',
          where: {
            and: [
              { product: { in: ids } },
              { store: { in: storeIds } },
              { quantity: { greater_than: 0 } },
            ],
          },
          select: { product: true, variantSku: true },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
  // "Some active store holds one" — the product page's availability (6.1.a); 6.3 picks the store.
  const held = new Set(stock.docs.map((row) => `${idOf(row.product)}\u0000${row.variantSku ?? ''}`))

  const catalogue = new Map<number, CatalogueProduct>()
  for (const doc of products.docs) {
    const productId = idOf(doc)
    if (productId === null) continue
    catalogue.set(productId, {
      productId,
      priceIdr: asNumberOrNull(doc.price) ?? 0,
      inStock: held.has(`${productId}\u0000`),
      variants: asArray(doc.variants).map((raw) => {
        const variant = asDoc(raw)
        const sku = typeof variant.sku === 'string' ? variant.sku : ''
        return {
          sku,
          priceIdr: asNumberOrNull(variant.price),
          active: variant.active === true,
          inStock: sku !== '' && held.has(`${productId}\u0000${sku}`),
        }
      }),
    })
  }
  return catalogue
}

function toDiscountRecord(value: unknown): DiscountRecord | null {
  const doc = asDoc(value)
  if (typeof doc.code !== 'string' || (doc.kind !== 'percent' && doc.kind !== 'fixed')) return null
  const date = (v: unknown) => (typeof v === 'string' || v instanceof Date ? v : null)
  return {
    code: doc.code,
    kind: doc.kind,
    value: asNumberOrNull(doc.value) ?? Number.NaN,
    minSpendIdr: asNumberOrNull(doc.minSpend),
    oncePerBuyer: doc.oncePerBuyer === true,
    startsAt: date(doc.startsAt),
    endsAt: date(doc.endsAt),
    usageLimit: asNumberOrNull(doc.usageLimit),
    usedCount: asNumberOrNull(doc.usedCount) ?? 0,
    active: doc.active === true,
  }
}

/** The shop's delivery table and welcome discount from `site-settings` (CONTENT-MODEL.md §6). */
async function loadShopSettings(
  payload: Payload,
): Promise<Pick<PricingInputs, 'settings' | 'welcome'>> {
  const settings = await loose(payload).findGlobal({
    slug: 'site-settings',
    select: { shop: { delivery: true, welcomeDiscount: true } },
    depth: 1,
    overrideAccess: true,
  })
  const shop = asDoc(settings.shop)
  const delivery = asDoc(shop.delivery)
  const bands: DeliveryBand[] = asArray(delivery.bands).map((raw) => {
    const band = asDoc(raw)
    // A missing figure becomes NaN, which `checkDeliveryTable` refuses: never a silent 0 fee.
    return {
      upToKm: asNumberOrNull(band.upToKm) ?? Number.NaN,
      feeIdr: asNumberOrNull(band.feeIdr) ?? Number.NaN,
    }
  })
  return {
    settings: { delivery: { bands, freeOverIdr: asNumberOrNull(delivery.freeOverIdr) } },
    welcome: toDiscountRecord(shop.welcomeDiscount),
  }
}

/** Everything `quoteBag` and `checkWelcomeCode` need for `lines`, read fresh (never cached). */
export async function loadPricingInputs(
  payload: Payload,
  lines: readonly BagLine[],
): Promise<PricingInputs> {
  const [catalogue, shop] = await Promise.all([
    loadCatalogue(payload, lines),
    loadShopSettings(payload),
  ])
  return { catalogue, ...shop }
}

/**
 * `HasBeenUsedBy` over `orders`: a paid (or later) order with this code for the same WhatsApp number
 * or email. An expired or cancelled order does not count — it gave its use back (COMMERCE.md §5).
 * The concurrent case (two checkouts at once) is 6.3's, in the order transaction.
 */
export function hasBeenUsedByFor(payload: Payload): HasBeenUsedBy {
  return async (contact: DiscountContact, code: string) => {
    const matches: Doc[] = []
    if (contact.whatsapp) matches.push({ 'contact.whatsapp': { equals: contact.whatsapp } })
    if (contact.email)
      matches.push({ 'contact.email': { equals: contact.email.trim().toLowerCase() } })
    if (matches.length === 0) return false
    const { docs } = await loose(payload).find({
      collection: 'orders',
      where: {
        and: [
          { 'discount.code': { equals: code } },
          { status: { in: [...PAID_ORDER_STATUSES] } },
          { or: matches },
        ],
      },
      select: { id: true },
      depth: 0,
      pagination: false,
      limit: 1,
      overrideAccess: true,
    })
    return docs.length > 0
  }
}

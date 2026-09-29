/**
 * @contract C2 — view models: variants and the configurator · owner: ARC · consumers: WEB, UXE, UXG
 *
 * A product sold in variants (EXPERIENCE-SHOP.md §4–5; books at the gallery). The options
 * are the page: server-rendered radio groups in a GET form that works without JavaScript,
 * the selection encoded in the URL, hydrated progressively; only the preview loads on
 * intent. The destination's price table ships with the page so the price updates on the
 * client — display only: the bag re-prices on the server and shows any difference.
 */
import type { ImageVM, LineIntent, MessageVM, PriceVM, VariantId } from '../common'
import type { PurchaseAnalyticsVM } from './purchase'

/** Product-type axes (CONTENT-MODEL.md §2). */
export type AxisKey =
  'format' | 'size' | 'paper' | 'frame' | 'mount' | 'glazing' | 'colour' | 'apparelSize'

export type Selection = Readonly<Partial<Record<AxisKey, string>>>

export type AxisOptionVM = {
  value: string
  label: string
  /** A named swatch (frame, mount, paper), ≥ 24 px on screen. */
  swatch: { colour: string | null; image: ImageVM | null } | null
  /** "From" price of this option for this destination. */
  from: PriceVM | null
  /** Impossible with the current selection — disabled with the reason shown, never hidden. */
  disabled: MessageVM | null
}

export type AxisVM = { axis: AxisKey; options: readonly AxisOptionVM[] }

/** A constraint the client re-evaluates as the selection changes (mount only with a frame…). */
export type ConfiguratorRuleVM = {
  when: Readonly<Partial<Record<AxisKey, readonly string[]>>>
  disables: { axis: AxisKey; values: readonly string[] }
  reason: MessageVM
}

/** Stock as the data states it — "Only 2 left" only when there are two (DESIGN-SYSTEM.md §10). */
export type VariantStockVM =
  | { kind: 'inShowroom'; count: number | null }
  | { kind: 'inStock'; lowCount: number | null }
  | { kind: 'madeToOrder'; leadDays: { min: number; max: number } }
  | { kind: 'soldOut'; backInStock: { href: string } | null }

export type SelectedVariantVM = {
  variantId: VariantId
  sku: string
  price: PriceVM
  stock: VariantStockVM
  /** What Add to bag posts for this selection: the variant and its options, no price. */
  line: LineIntent
}

/** The promise for this ship-to destination, read against the holiday calendar. */
export type DeliveryPromiseVM = {
  /** "Ready at the showroom in 2 hours" · "Made to order, ships in 3–5 days"… */
  lines: readonly MessageVM[]
  /** For the saved district, so a shipping cost is never first seen at checkout. */
  shippingEstimate: PriceVM | null
  duties: { kind: 'included' } | { kind: 'estimated'; amount: PriceVM } | null
  /** Nyepi, Lebaran: a closure that moves the promise. */
  holiday: MessageVM | null
}

/** Layers composited in the browser (DESIGN-SYSTEM.md §7) — never the scan redrawn on a canvas. */
export type PreviewVM = {
  /** A pre-sized ~1200 px AVIF of the artwork. */
  flat: ImageVM
  /** 9-slice frame layer per frame option value. */
  frames: Readonly<Record<string, string>>
  /** Pre-composited room plates, one per wall colour. */
  rooms: readonly { wall: string; image: ImageVM }[]
  /** Physical size of the current selection, for the "to scale" view. */
  scale: { widthMm: number; heightMm: number } | null
}

export type VariantsPurchaseVM = {
  kind: 'variants'
  /** "From Rp 95.000" until options are chosen: the cheapest variant that ships here. */
  from: PriceVM | null
  axes: readonly AxisVM[]
  selection: Selection
  /** Set once every axis is chosen. */
  selected: SelectedVariantVM | null
  /** This destination's table — display only. */
  priceTable: readonly { options: Selection; price: PriceVM }[]
  rules: readonly ConfiguratorRuleVM[]
  delivery: DeliveryPromiseVM
  /**
   * `null` when `commerce.giftWrap` is off. Wrap is a priced line of its own; from the item
   * page it wraps the order (the product's bag line does not exist yet) — per-line wrapping is
   * chosen in the bag (C6 `GiftWrapTarget`).
   */
  giftWrap: { line: LineIntent; price: PriceVM } | null
  actions: {
    /**
     * `true`: Add to bag, once `selected` is set. Otherwise the reason it cannot be added here —
     * a selection that cannot ship to this destination, sold out with no restock — shown in
     * words where the button would be: never a disabled button without a reason.
     */
    addToBag: true | { unavailable: MessageVM }
    /** "Ask on WhatsApp" with the product and chosen options prefilled. */
    whatsapp: string | null
    /** "Turn this into a quote" — the Quote surface, for business buyers. */
    quote: string | null
  }
  /** `configurator.framing` on: loads on intent; `null` otherwise. */
  preview: PreviewVM | null
  /** Opened from a showroom QR label: pick it up now, buy and take it, or have it sent. */
  showroom: boolean
  analytics: PurchaseAnalyticsVM
}

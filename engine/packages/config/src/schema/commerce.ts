/**
 * @contract C1 — brand config: commerce, shipping, fulfilment · owner: ARC · entry: `@engine/config/schema`
 *
 * What a brand sells and how long a reservation lasts (COMMERCE.md §4, §7, §8). The TTLs
 * are the ones `reserve()` (C8) is called with; the purchase tiers decide which actions a
 * unique item's panel leads with; the trade tiers price an approved retailer's quotes (D32).
 * Provider ids are declared here because config is the leaf; C7
 * (`@engine/{shipping,fulfilment}/contract`) imports them.
 */
import { z } from 'zod'

import { isLadder, LADDER_MESSAGE } from './primitives'
import { tradeConfigSchema } from './trade'

export const INVENTORY_MODELS = [
  'unique',
  'edition',
  'stocked',
  'made-to-order',
  'pod',
  'service',
] as const
export type InventoryModel = (typeof INVENTORY_MODELS)[number]

/** What a purchase panel can offer (COMMERCE.md §7); `ItemVM.purchase` (C2) uses these. */
export const PURCHASE_ACTIONS = [
  'buy',
  'reserve',
  'offer',
  'enquire',
  'whatsapp',
  // A `tel:` link to the brand's number (`identity.contact.phone`): the gallery negotiates every
  // original by phone or WhatsApp (D50, v1.5).
  'call',
  'requestPrice',
  'viewing',
  // Opens the `quote` form (C10; `quote.request`), which staff answer with a proforma within the
  // stated reply time — so its copy promises that, never an instant proforma PDF: the instant one
  // is the checkout's ("Proforma instead", C6 `quote.proforma`).
  'proforma',
] as const
export type PurchaseAction = (typeof PURCHASE_ACTIONS)[number]

/**
 * Whether a unique item's asking price is ever published (COMMERCE.md §7, D50). `shown`: a priced
 * item shows its price, and a request for one on request is answered in place (or queued for a
 * person, an item marked sensitive). `on-request`: no unique item's price reaches any public read —
 * a page, a card, a facet or a sort, a want-list budget, a factsheet, a social image, structured
 * data, a feed, a sister snapshot or an analytics band — every one reads "Price on request", a
 * request is always a person's to answer, and the agreed figure reaches the buyer only on the
 * invoice staff issue (C6 `QuoteView`, `PayLinkView`). The stored asking price stays staff's.
 */
export const UNIQUE_PRICES = ['shown', 'on-request'] as const
export type UniquePrices = (typeof UNIQUE_PRICES)[number]

export const SHIPPING_PROVIDERS = ['flat', 'biteship', 'dhl-express', 'quote', 'collect'] as const
export type ShippingProviderId = (typeof SHIPPING_PROVIDERS)[number]

export const FULFILMENT_PROVIDERS = ['own-stock', 'local-production', 'prodigi', 'gelato'] as const
export type FulfilmentProviderId = (typeof FULFILMENT_PROVIDERS)[number]

/** Named reservation TTLs (COMMERCE.md §4). Defaults are the documented ones. */
export const ttlSchema = z.strictObject({
  checkoutLockMinutes: z.int().positive().default(15),
  /** How long a lock outlives the chosen method's `sessionTtl` (PAYMENTS.md §1 rule 4). */
  lockMarginMinutes: z.int().nonnegative().default(10),
  /**
   * The furthest `extend()` may push a unique item's checkout lock. A method whose
   * `sessionTtl` plus `lockMarginMinutes` would pass it is not offered for a unique item, so a
   * virtual account can never hold a one-of-one for a day. Owner to confirm the default.
   */
  checkoutLockMaxHours: z.int().positive().default(3),
  holdDefaultHours: z.int().positive().default(48),
  holdMaxHours: z.int().positive().default(72),
  /** How long before a hold ends the buyer is told: `hold.expiring`, C8 `noticeExpiring`'s lead. */
  holdNoticeHours: z.int().positive().default(12),
  offerHoldHours: z.int().positive().default(48),
  offerCounterHours: z.int().positive().default(72),
  /**
   * The term the order builder proposes for an invoice's due date — three days, the owner's
   * answer (D45, 2026-10-01; v1.5, was 7). An `invoice` hold lasts until the due date the issuing
   * staff set, which they may change per invoice — `reserve()` is called with the time to it — and
   * lapses by itself, unpaid; staff re-date it with `extend()` or cancel it with `release()`.
   */
  invoiceHoldDays: z.int().positive().default(3),
  /**
   * How long before an invoice's due date its buyer is reminded — a day, the owner's answer
   * (D45, 2026-10-01): `invoiceHold.expiring`, C8 `noticeExpiring`'s lead for the `invoice`
   * kind (v1.5).
   */
  invoiceNoticeHours: z.int().positive().default(24),
})
export type CommerceTtl = z.infer<typeof ttlSchema>

/**
 * A price band and the actions it leads with. Ascending by `upTo`, in base-currency minor
 * units; the last tier has `upTo: null` (no ceiling). Price on request, institutions and
 * sold items are decided by the item's state, not by a tier.
 */
export const purchaseTierSchema = z.strictObject({
  upTo: z.int().positive().nullable(),
  primary: z.enum(PURCHASE_ACTIONS),
  secondary: z.array(z.enum(PURCHASE_ACTIONS)).default([]),
})
export type PurchaseTier = z.infer<typeof purchaseTierSchema>

/**
 * Which purchase tier an item's price falls in, by its position in `purchaseTiers` (`tier-1` the
 * lowest), or why it has none: what C11's `item.viewed` reports instead of an amount, and what
 * the purchase panel hands the page to report (C2 `PurchaseVM.analytics`). Where `uniquePrices` is
 * `on-request`, every unique item's band is `on-request`: a tier worked out from a private price
 * would tell anyone reading the page's beacon the range that price lies in.
 */
export type PurchaseBand = `tier-${number}` | 'on-request' | 'none'

export const commerceConfigSchema = z
  .strictObject({
    inventoryModels: z.array(z.enum(INVENTORY_MODELS)).min(1),
    ttl: ttlSchema.prefault({}),
    /** Empty: every priced unique item leads with `buy`. */
    purchaseTiers: z.array(purchaseTierSchema).default([]).refine(isLadder, LADDER_MESSAGE),
    /** Whether a unique item's price is ever published (`UNIQUE_PRICES`; D50, v1.5). */
    uniquePrices: z.enum(UNIQUE_PRICES).default('shown'),
    /** The trade terms of `accounts.retailers` (`./trade`); `null` for a brand without partners. */
    trade: tradeConfigSchema.nullable().default(null),
  })
  .superRefine((commerce, ctx) => {
    // Buy adds a unique item to a bag at its list price, and with prices on request there is none
    // to charge: the brand sells on an invoice staff issue at the agreed figure instead (D50).
    if (commerce.uniquePrices !== 'on-request') return
    const message = '"buy" has no price to charge while uniquePrices is "on-request" (D50)'
    commerce.purchaseTiers.forEach((tier, i) => {
      if (tier.primary === 'buy') {
        ctx.addIssue({ code: 'custom', path: ['purchaseTiers', i, 'primary'], message })
      }
      tier.secondary.forEach((action, j) => {
        if (action !== 'buy') return
        ctx.addIssue({ code: 'custom', path: ['purchaseTiers', i, 'secondary', j], message })
      })
    })
  })
export type CommerceConfig = z.infer<typeof commerceConfigSchema>

/**
 * Couriers: the brand's `shipping` lists every one it uses, and each seller ships with its own
 * subset of them (`sellers[].shipping`, all of them when it names none) — rate sources and
 * secrets are per seller (COMMERCE.md §8, DEPLOYMENT.md §8).
 */
export const shippingConfigSchema = z.strictObject({
  providers: z.array(z.enum(SHIPPING_PROVIDERS)).min(1),
})
export type ShippingConfig = z.infer<typeof shippingConfigSchema>
/** Fulfilment providers are the brand's, never a seller's (DEPLOYMENT.md §8). */
export const fulfilmentConfigSchema = z.strictObject({
  providers: z.array(z.enum(FULFILMENT_PROVIDERS)).min(1),
})

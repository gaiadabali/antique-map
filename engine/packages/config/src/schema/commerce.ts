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

import { idSchema, isLadder, LADDER_MESSAGE, positiveMoneySchema } from './primitives'

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
  'requestPrice',
  'viewing',
  'proforma',
] as const
export type PurchaseAction = (typeof PURCHASE_ACTIONS)[number]

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
  invoiceHoldDays: z.int().positive().default(7),
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
 * A trade tier's minimum order (D32), as C5's `TradeMinimum` holds it: goods worth `amount` at
 * the prices paid, in the currency the seller quotes its retailers in — or `pieces` of each
 * design, its sizes and formats counted together when `mixedSizes`.
 */
export const tradeMinimumSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('amount'), amount: positiveMoneySchema }),
  z.strictObject({
    kind: z.literal('piecesPerDesign'),
    pieces: z.int().positive(),
    mixedSizes: z.boolean(),
  }),
])

/** A trade price tier (C5 `TradeTerms`): basis points off the market list, 4000 being 40 % off. */
export const tradeTierSchema = z.strictObject({
  id: idSchema,
  discountBps: z.int().min(0).max(9999),
  minimum: tradeMinimumSchema,
})
export type TradeTierConfig = z.infer<typeof tradeTierSchema>

/**
 * The retail partners' programme (D31, D32): the tiers, and the one approval assigns. Staff
 * move an approved retailer to another tier; only the server resolves a retailer's tier, and
 * only for its own quotes. A CMS global may override the tiers (BRANDS.md §3) — as an owner's
 * setting, audited, never an editor's, since it moves money. Tier ids are unique and
 * `defaultTier` is one of them.
 */
export const tradeConfigSchema = z
  .strictObject({ tiers: z.array(tradeTierSchema).min(1), defaultTier: idSchema })
  .superRefine((trade, ctx) => {
    const ids = trade.tiers.map((tier) => tier.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['tiers'], message: 'tier ids must be unique' })
    }
    if (!ids.includes(trade.defaultTier)) {
      ctx.addIssue({ code: 'custom', path: ['defaultTier'], message: 'not one of the tiers' })
    }
  })
export type TradeConfig = z.infer<typeof tradeConfigSchema>

export const commerceConfigSchema = z.strictObject({
  inventoryModels: z.array(z.enum(INVENTORY_MODELS)).min(1),
  ttl: ttlSchema.prefault({}),
  /** Empty: every priced unique item leads with `buy`. */
  purchaseTiers: z.array(purchaseTierSchema).default([]).refine(isLadder, LADDER_MESSAGE),
  /** The trade tiers of `accounts.retailers` (D32); `null` for a brand without retail partners. */
  trade: tradeConfigSchema.nullable().default(null),
})
export type CommerceConfig = z.infer<typeof commerceConfigSchema>

export const shippingConfigSchema = z.strictObject({
  providers: z.array(z.enum(SHIPPING_PROVIDERS)).min(1),
})
export const fulfilmentConfigSchema = z.strictObject({
  providers: z.array(z.enum(FULFILMENT_PROVIDERS)).min(1),
})

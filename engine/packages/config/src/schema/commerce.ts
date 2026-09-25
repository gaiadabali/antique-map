/**
 * @contract C1 — brand config: commerce, shipping, fulfilment · owner: ARC · entry: `@engine/config/schema`
 *
 * What a brand sells and how long a reservation lasts (COMMERCE.md §4, §7, §8). The TTLs
 * are the ones `reserve()` (C8) is called with; the purchase tiers decide which actions a
 * unique item's panel leads with. Provider ids are declared here because config is the
 * leaf; C7 (`@engine/{shipping,fulfilment}/contract`) imports them.
 */
import { z } from 'zod'

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
  holdDefaultHours: z.int().positive().default(48),
  holdMaxHours: z.int().positive().default(72),
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

export const commerceConfigSchema = z.strictObject({
  inventoryModels: z.array(z.enum(INVENTORY_MODELS)).min(1),
  ttl: ttlSchema.prefault({}),
  purchaseTiers: z
    .array(purchaseTierSchema)
    .default([])
    .refine(
      (tiers) =>
        tiers.every((tier, i) => {
          const next = tiers[i + 1]
          if (!next) return tier.upTo === null
          return tier.upTo !== null && (next.upTo === null || next.upTo > tier.upTo)
        }),
      'tiers ascend by upTo and only the last has upTo: null',
    ),
})
export type CommerceConfig = z.infer<typeof commerceConfigSchema>

export const shippingConfigSchema = z.strictObject({
  providers: z.array(z.enum(SHIPPING_PROVIDERS)).min(1),
})
export const fulfilmentConfigSchema = z.strictObject({
  providers: z.array(z.enum(FULFILMENT_PROVIDERS)).min(1),
})

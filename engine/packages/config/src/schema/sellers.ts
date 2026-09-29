/**
 * @contract C1 — brand config: sellers of record · owner: ARC · entry: `@engine/config/schema`
 *
 * Sellers are data (COMMERCE.md §2, BRANDS.md §3): one per checkout, chosen from the stock
 * location and the destination, and everything the buyer sees — currency, tax, methods,
 * legal identity — follows from it. The provider ids and method families are declared here
 * because config is the leaf and validates them; C7 (`@engine/payments/contract`) imports
 * them rather than redeclaring, and maps each granular method onto a family.
 */
import { z } from 'zod'

import { shippingConfigSchema, type ShippingConfig } from './commerce'
import {
  countryCodeSchema,
  currencyCodeSchema,
  destinationSchema,
  idSchema,
  positiveMoneySchema,
} from './primitives'

/** PAYMENTS.md §2 `ProviderId`. */
export const PAYMENT_PROVIDERS = [
  'manual',
  'bank-transfer',
  'stripe',
  'midtrans',
  'xendit',
  'doku',
  'paypal',
] as const
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number]

/**
 * The method families a seller's `methodOrder` sorts (PAYMENTS.md §3). A buyer picks a
 * granular C7 method (`va-bca`, `gopay`, `apple-pay`); each belongs to exactly one family —
 * `express-wallet` is Apple Pay / Google Pay, `ewallet` GoPay, OVO, DANA, ShopeePay, `va`
 * every bank's virtual account, `retail` cash at a convenience store, `paylater` Kredivo and
 * Akulaku — and C7 declares that mapping against this list (CONTRACTS.md, C1 ⇄ C7).
 */
export const PAYMENT_METHOD_FAMILIES = [
  'card',
  'express-wallet',
  'paynow',
  'ideal',
  'sepa-debit',
  'va',
  'qris',
  'ewallet',
  'retail',
  'paylater',
  'bank-transfer',
  'paypal',
  'manual',
] as const
export type PaymentMethodFamily = (typeof PAYMENT_METHOD_FAMILIES)[number]

/** COMMERCE.md §9. */
export const TAX_REGIMES = ['ID-PPN', 'SG-GST', 'none'] as const
export type TaxRegime = (typeof TAX_REGIMES)[number]

export const sellerSchema = z.strictObject({
  id: idSchema,
  /** A placeholder legal entity (owner decisions D1–D3): `bootCheck()` refuses it in production. */
  draft: z.boolean().default(false),
  entity: z.strictObject({
    name: z.string().min(1),
    country: countryCodeSchema,
    registration: z.string().min(1),
    address: z.array(z.string().min(1)).default([]),
  }),
  serves: z.strictObject({
    /** Location ids (the `locations` collection); a line from anywhere else sells nowhere. */
    stockLocations: z.array(idSchema).min(1),
    destinations: z.array(destinationSchema).min(1),
  }),
  /** `registered: false` charges no tax (D4: PPN off until confirmed). */
  tax: z.strictObject({ regime: z.enum(TAX_REGIMES), registered: z.boolean() }),
  /** The currencies this entity may charge — an Indonesian PT: IDR only. */
  charge: z.array(currencyCodeSchema).min(1),
  payments: z.array(z.enum(PAYMENT_PROVIDERS)).min(1),
  /**
   * The couriers this seller ships with. A courier account is the seller's own, like a gateway's,
   * so its secrets are too (`SHIPPING_<SELLER>_<PROVIDER>_*`, DEPLOYMENT.md §8): a Singapore
   * entity shipping its own stock abroad has no Indonesian courier account. Each is one of the
   * brand's `shipping.providers`, which list every courier the brand uses (`validateBrandConfigs()`).
   * Left out, the seller ships with all of the brand's: the parsed config always carries the
   * resolved list (`SellerConfig`), so no consumer merges the two.
   */
  shipping: shippingConfigSchema.optional(),
  /** Families first to last; a family left out sorts after those listed. */
  methodOrder: z.array(z.enum(PAYMENT_METHOD_FAMILIES)).default([]),
  /** Cards above this route to bank transfer or invoice (PAYMENTS.md §3 risk policy). */
  cardCeiling: positiveMoneySchema.nullable().default(null),
  /** Originals above this ship on a quote with fine-art transit cover (COMMERCE.md §8). */
  insuredThreshold: positiveMoneySchema.nullable().default(null),
  /** Duties at the border: DAP (the buyer pays on delivery) by default, DDP when enabled. */
  duties: z.enum(['DAP', 'DDP']).default('DAP'),
  /** Prefix of the seller's gapless order, proforma and invoice numbers (COMMERCE.md §12). */
  documentPrefix: z.string().regex(/^[A-Z0-9]{1,8}$/, '1–8 upper-case letters or digits'),
})
/** A seller as its brand's file writes it: `shipping` may be left out. */
export type SellerConfigInput = z.input<typeof sellerSchema>
/**
 * A seller as every consumer reads it, from the parsed `BrandConfig`: its couriers resolved —
 * its own, or the brand's when it names none (`brandConfigSchema` resolves them).
 */
export type SellerConfig = Omit<z.infer<typeof sellerSchema>, 'shipping'> & {
  shipping: ShippingConfig
}

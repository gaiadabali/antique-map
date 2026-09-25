/**
 * @contract C1 — brand config: sellers of record · owner: ARC · entry: `@engine/config/schema`
 *
 * Sellers are data (COMMERCE.md §2, BRANDS.md §3): one per checkout, chosen from the stock
 * location and the destination, and everything the buyer sees — currency, tax, methods,
 * legal identity — follows from it. The provider and method ids are declared here because
 * config is the leaf; C7 (`@engine/payments/contract`) imports them and never redeclares.
 */
import { z } from 'zod'

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
 * Method families a buyer chooses between — what `methodOrder` sorts and what routing
 * filters by amount caps (PAYMENTS.md §3). `express-wallet` is Apple Pay / Google Pay;
 * `ewallet` is GoPay, OVO, DANA, ShopeePay; `retail` is cash at a convenience store.
 */
export const PAYMENT_METHODS = [
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
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]

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
  methodOrder: z.array(z.enum(PAYMENT_METHODS)).default([]),
  /** Cards above this route to bank transfer or invoice (PAYMENTS.md §3 risk policy). */
  cardCeiling: positiveMoneySchema.nullable().default(null),
  /** Originals above this ship on a quote with fine-art transit cover (COMMERCE.md §8). */
  insuredThreshold: positiveMoneySchema.nullable().default(null),
  /** Duties at the border: DAP (the buyer pays on delivery) by default, DDP when enabled. */
  duties: z.enum(['DAP', 'DDP']).default('DAP'),
  /** Prefix of the seller's gapless order, proforma and invoice numbers (COMMERCE.md §12). */
  documentPrefix: z.string().regex(/^[A-Z0-9]{1,8}$/, '1–8 upper-case letters or digits'),
})
export type SellerConfig = z.infer<typeof sellerSchema>

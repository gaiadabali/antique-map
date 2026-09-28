/**
 * @contract C6 Commerce API — what a client may send · owner: ARC · via `@engine/domain/api`
 *
 * Priced on the server, every time (COMMERCE.md §1): a request carries ids, quantities, choices,
 * contact details and the ship-to country — never a price, a total, a discount amount, a shipping
 * cost or a rate. `IsServerPriced` proves it at compile time over every C6 request (api.ts); a
 * field that could smuggle a figure fails the build before a handler could ever read it.
 */
import type { LocaleCode } from '@engine/config/schema'

import type { IsoDate } from './scalars'

/** A product's public id: the number in its URL (`/product/1706-…`), stable for ever. */
export type ProductPublicId = number
/** A variant's database id. */
export type VariantId = number
/** An upload the forms endpoint accepted (photos for a consignment or a return): opaque. */
export type UploadId = string

/** One thing to buy: which, which form of it, how many — and nothing that has a price. */
export type LineInput = {
  readonly productId: ProductPublicId
  readonly variantId: VariantId | null
  /** A positive safe integer; always 1 for a unique item or an edition unit. */
  readonly quantity: number
  /** Configurator choices beyond the variant (axis → option), checked against the product type. */
  readonly options: { readonly [axis: string]: string } | null
  /** A gift card line: who receives it and when. Its value is its variant's server price. */
  readonly giftCard: GiftCardDelivery | null
}

export type GiftCardDelivery = {
  readonly recipientName: string
  readonly recipientEmail: string | null
  readonly recipientWhatsapp: string | null
  readonly message: string | null
  readonly sendOn: IsoDate
}

/** At least one way to reach the buyer: an email, a WhatsApp number, or both. */
type ContactChannel =
  | { readonly email: string; readonly whatsapp: string | null }
  | { readonly email: null; readonly whatsapp: string }

/**
 * A buyer's contact details. One full-name field (many Indonesians have a single name); the
 * WhatsApp number is normalised on the server (`08xx` → `+62 8xx`). Marketing consent is separate
 * and unticked by default, per purpose; the server records the policy version and the time
 * (COMPLIANCE.md §7).
 */
export type ContactInput = ContactChannel & {
  readonly fullName: string
  /** The buyer says the number is on WhatsApp: order updates go there only if so. */
  readonly whatsappConfirmed: boolean
  readonly locale: LocaleCode
  readonly consents: { readonly marketingEmail: boolean; readonly marketingWhatsapp: boolean }
}

/** A lead's contact (price request, enquiry, offer): a way back to the buyer, a name if given. */
export type LeadContactInput = ContactChannel & {
  readonly fullName: string | null
  readonly locale: LocaleCode
  readonly consents: { readonly marketingEmail: boolean; readonly marketingWhatsapp: boolean }
}

/** Shown when the buyer says they buy for an institution (COMMERCE.md §5, §7). */
export type InstitutionInput = {
  readonly organisation: string
  readonly taxId: string | null
  readonly poNumber: string | null
}

// ─── The server-priced guard ─────────────────────────────────────────────────────────────────

/** Keys that name a figure only the server computes. */
export type ServerComputedKey =
  | 'price'
  | 'prices'
  | 'unitPrice'
  | 'amount'
  | 'total'
  | 'totals'
  | 'subtotal'
  | 'grandTotal'
  | 'discount'
  | 'lineDiscount'
  | 'orderDiscount'
  | 'shipping'
  | 'shippingCost'
  | 'tax'
  | 'charge'
  | 'estimate'
  | 'fx'
  | 'rate'
  | 'value'
  | 'cost'
  | 'fee'
  | 'balance'
  | 'deposit'

type MoneyShaped = { readonly amount: unknown; readonly currency: unknown }
type AllTrue<R> = false extends R[keyof R] ? false : true

/**
 * `true` when no property of `T`, at any depth, is Money-shaped or named for a server-computed
 * figure — except the keys in `Allowed`, each justified where an operation declares it (the one
 * today: an offer's `proposal`, a buyer's bid that the private floor and staff judge). `Allowed`
 * exempts a key at the request's TOP level only: the same name one level down is still caught,
 * so declaring the bid cannot open a hole anywhere else in the request.
 */
export type IsServerPriced<T, Allowed extends PropertyKey = never> = T extends readonly (infer E)[]
  ? IsServerPriced<E>
  : T extends MoneyShaped
    ? false
    : T extends object
      ? [Extract<Exclude<keyof T, Allowed>, ServerComputedKey>] extends [never]
        ? AllTrue<{ [K in Exclude<keyof T, Allowed>]-?: IsServerPriced<T[K]> }>
        : false
      : true

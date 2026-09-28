/**
 * @contract C6 Commerce API — the shop's retail partners · owner: ARC · via `@engine/domain/api`
 * The value `RETAILER_SHOP_TYPES` is at `@engine/domain/retailers`.
 *
 * D31, D32: on the shop, shoppers buy as guests and retailers hold the only accounts (C1 module
 * `accounts.retailers`). A shop applies on the Partnership page (C10 `partnership`); staff approve
 * or decline it in the admin (C8 `machines/retailer`); approval emails a set-password link (TASKS.md
 * 28.1) and assigns the brand's default trade tier; an approved retailer then orders through quotes
 * built in the order builder (24.5), paid by bank transfer or a pay link — there is no wholesale
 * cart. A pending or declined applicant never sees a trade price: its standing reaches it through
 * C13's one-hop status link or a session (C2 `RetailerStandingVM`), never with terms. The page's
 * one form sends a shop's answer here; a company's or a hotel's is a business quote
 * (`quote.request`) and makes no account (EXPERIENCE-SHOP.md §9).
 */
import type { CountryCode, LocaleCode } from '@engine/config/schema'

import type { IdempotencyKey } from './results'
import type { Accepts, Assert, Equals } from './type-assertions'

/** What kind of shop applies: a controlled list, so the CMS select (SCH) and the form agree. */
export const RETAILER_SHOP_TYPES = [
  'souvenir-shop',
  'gift-shop',
  'gallery',
  'bookshop',
  'hotel-boutique',
  'museum-shop',
  'concept-store',
  'other',
] as const
export type RetailerShopType = (typeof RETAILER_SHOP_TYPES)[number]

/**
 * The shop being proposed. `npwp` is required when `country` is Indonesia — 15 or 16 digits once
 * dots and dashes are stripped, its shape checked on the server — and null elsewhere, where
 * `taxNumber` may give the country's own. A sole trader's NPWP can be their NIK, so both are
 * personal data: stored like a contact detail, shown to staff only, never put in an event. The
 * address is the shop's, as written — its structured delivery address comes with its first quote.
 */
export type RetailerBusinessInput = {
  readonly name: string
  readonly shopType: RetailerShopType
  readonly country: CountryCode
  readonly address: string
  readonly npwp: string | null
  readonly taxNumber: string | null
  readonly website: string | null
  /** "Tell us about your shop": where it is, who buys there, which designs. */
  readonly message: string | null
}

/** The person applying. The set-password link goes to `email`, so an email is required here. */
export type RetailerContactInput = {
  readonly fullName: string
  readonly email: string
  /** Normalised on the server (`08xx` → `+62 8xx`). */
  readonly whatsapp: string | null
  readonly locale: LocaleCode
}

/**
 * A shop's application (TASKS.md 28.5.b), validated on the server field by field — the name, the
 * country and the NPWP it requires, the shop type against the list, the email, the WhatsApp
 * number — and saved as a customer with `retailerStatus: applied` (C1). `consent.application` is
 * required: it is to this processing that the applicant agrees ("we will only write back about this
 * application"). Each marketing purpose is a separate choice, unticked by default. The server
 * records every one with the policy version and the time (COMPLIANCE.md §7).
 */
export type RetailerApplyRequest = {
  readonly business: RetailerBusinessInput
  readonly contact: RetailerContactInput
  readonly consent: {
    readonly application: true
    readonly marketingEmail: boolean
    readonly marketingWhatsapp: boolean
  }
  readonly idempotencyKey: IdempotencyKey
}

/**
 * The same answer whoever applies — a first application, a repeat while one is pending, the email
 * of a shop that is already a partner. The domain acts on each case by email (nothing new, a
 * sign-in reminder, a re-application after a decline), so the form never tells anyone who is a
 * partner; for the same reason it carries no token — the status link is emailed.
 */
export type RetailerApplicationReceipt = {
  readonly received: true
  /** The brand's stated reply window ("answered within two working days"); null if none is set. */
  readonly replyWithinHours: number | null
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _ApplicationIsAgreedTo = Accepts<
  RetailerApplyRequest['consent'],
  // @ts-expect-error — the applicant agrees to the application's processing, or does not apply
  { application: false; marketingEmail: false; marketingWhatsapp: false }
>
// The receipt is identical whoever applies: nothing in it names, admits or links an applicant.
type _ReceiptRevealsNothing = Assert<
  Equals<Exclude<keyof RetailerApplicationReceipt, 'received' | 'replyWithinHours'>, never>
>

/**
 * @contract C6 Commerce API — the shop's retail partners · owner: ARC · via `@engine/domain/api`
 * The values `RETAILER_SHOP_TYPES` and the application's limits are at `@engine/domain/retailers`.
 *
 * D31, D32, D36: on the shop, shoppers buy as guests and partners hold the only accounts (C1
 * `accounts.retailers`) — one programme for every business buyer: shops, hotels, villas, cafés
 * and companies all apply here, and the Partnership page posts no quote brief. Staff approve or
 * decline an application in the admin (C8 `machines/retailer`); approval emails a set-password
 * link (TASKS.md 28.1) and assigns the brand's default trade tier; an approved partner then orders
 * through quotes built in the order builder (24.5), paid by bank transfer or a pay link — there
 * is no wholesale cart. An applicant never sees a trade price: its standing reaches it through
 * C13's one-hop status link, emailed, never with terms (C2 `RetailerStandingVM`).
 */
import type { CountryCode, LocaleCode } from '@engine/config/schema'

import type { IdempotencyKey } from './results'
import type { Accepts, Assert, Equals } from './type-assertions'

/** What kind of business applies (D36): a controlled list, so SCH's select and the form agree. */
export const RETAILER_SHOP_TYPES = [
  'souvenir-shop',
  'gift-shop',
  'gallery',
  'bookshop',
  'hotel-boutique',
  'museum-shop',
  'concept-store',
  'hotel',
  'villa',
  'cafe-restaurant',
  'corporate',
  'other',
] as const
export type RetailerShopType = (typeof RETAILER_SHOP_TYPES)[number]

/**
 * The business being proposed. `npwp` is required when `country` is Indonesia — 15 or 16 digits
 * once dots and dashes are stripped, its shape checked on the server — and null elsewhere, where
 * `taxNumber` may give the country's own. A sole trader's NPWP can be their NIK, so both are
 * personal data: stored like a contact detail, shown to staff only, never put in an event. The
 * address is the business's, as written — its structured delivery address comes with its first
 * quote. An approved partner's quotes take their `InstitutionInput` from here — `name` as the
 * organisation, the NPWP (or `taxNumber`) as `taxId`, for the tax-invoice export.
 */
export type RetailerBusinessInput = {
  readonly name: string
  readonly shopType: RetailerShopType
  readonly country: CountryCode
  readonly address: string
  readonly npwp: string | null
  readonly taxNumber: string | null
  readonly website: string | null
  /** "Tell us about your business": where it is, who buys there, which designs. */
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
 * An application (TASKS.md 28.5.b), validated on the server field by field — the name, the country
 * and the NPWP it requires, the type against the list, the email, the WhatsApp number. The
 * applicant agrees to `consent.application` ("we will only write back about this application"),
 * or does not apply; each marketing purpose is a separate choice, unticked by default, and the
 * server records every one with the policy version and the time (COMPLIANCE.md §7). A post is
 * unauthenticated, so it never edits a record: a re-application's answers are kept beside the
 * earlier ones for staff, and a repeat changes nothing.
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
 * The same answer whoever applies. The domain acts on the address, by email only: a new one is
 * `apply` ("received", with the status link); a declined or ended one, `reapply`; one waiting on
 * staff or already a partner changes nothing (`retailer.applicationRepeated`: the status link
 * again — to a partner, a sign-in reminder, or its set-password link if it has no password yet).
 * Email goes through the outbox after commit, never from the request, so the handler's work and
 * time are alike in every case; `invalid` is about the answers' shape, never whether an address
 * is known. A post without JavaScript answers 303 with this receipt parked on the server (C13):
 * it sets no application-access cookie and signs no one in.
 */
export type RetailerApplicationReceipt = {
  readonly received: true
  /** The brand's stated reply window ("answered within two working days"); null if none is set. */
  readonly replyWithinHours: number | null
}

/**
 * The email this form can cause, whichever case above, reaches one address at most `perAddress`
 * times in `windowHours` — counted by NTF at dispatch, on top of C13's per-IP limit on the route.
 * It is silent: a post past it gets the same receipt, never `rate-limited`, which is about the
 * caller, never the address.
 */
export const RETAILER_APPLICATION_EMAIL_LIMIT = { perAddress: 1, windowHours: 24 } as const

/**
 * How long an application that never became a partnership keeps its personal data — one declined,
 * or never decided — counted from its last change (submitted, decided, re-applied). Then DOM's
 * retention job (28.4) erases its answers and contact and keeps what names no one: the status,
 * the dates, the kind of business, the outbox rows. A record with orders (a former partner that
 * re-applied and was declined) loses only the application's answers: its orders keep what the law
 * requires (28.4.b). An ended partnership's record is kept with its orders, like any customer's,
 * until erased on request. In 28.4, an applicant's export holds its answers, decisions and
 * consents; erasure on request is the same purge at once — a partner's ends its partnership first
 * (`end`); the record of processing lists the application (purpose: a partnership; basis:
 * `consent.application`; this period). Counsel confirms the period.
 */
export const RETAILER_APPLICATION_RETENTION_DAYS = 365

// ─── An approved partner's reorder (D32) ─────────────────────────────────────────────────────

/**
 * "Reorder" on an order in the partner's history (`quote.reorder`). Only the order is named, by
 * the number the partner sees (`OrderSummaryView.number`), so a plain HTML form posts it — a
 * hidden field and the key — and no line can be edited on the way. The session is the only
 * credential: an approved partner whose own order it is; no session, another customer's order, an
 * unknown number or a partner no longer approved all answer the same `not-found`. The server
 * copies the order's lines — product, variant, options, quantity, never a price — into a new
 * `requested` quote, contact the session's customer, institution the partner's business, and staff
 * price it at issue at the tier then in force (C5); what is no longer offered, the order builder
 * flags for staff to take out (24.5).
 */
export type QuoteReorderRequest = {
  readonly fromOrder: string
  readonly idempotencyKey: IdempotencyKey
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
// D36: every business buyer is a partner.
type _OneProgramme = Assert<
  Equals<Exclude<'hotel' | 'villa' | 'cafe-restaurant' | 'corporate', RetailerShopType>, never>
>
// A reorder names the order and nothing else: its lines are the server's to copy.
type _ReorderNamesOnlyTheOrder = Assert<
  Equals<keyof QuoteReorderRequest, 'fromOrder' | 'idempotencyKey'>
>

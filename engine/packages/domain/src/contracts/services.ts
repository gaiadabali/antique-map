/**
 * @contract C6 Commerce API — enquiries, consignments and appointments · owner: ARC · via `@engine/domain/api`
 *
 * The forms that behave like the gallery, not like a CMS (EXPERIENCE-GALLERY.md §9): stored, on
 * the staff desk, with a stated reply time. Photos are uploaded first through the forms upload
 * endpoint (HEIC accepted, per-file progress, retried on weak networks) and referenced by id.
 */
import type { LeadContactInput, ProductPublicId, UploadId } from './requests'
import type { IdempotencyKey } from './results'
import type { IsoDate, IsoInstant } from './scalars'
import type { Assert, Equals } from './type-assertions'

/**
 * CONTENT-MODEL.md §4 `enquiries.topic`. No topic is for trade or business: every business buyer
 * applies as a partner (`retailer.apply`, the Partnership page — D36), and an institution asks for
 * a proforma or a quote (`./after-sale`).
 */
export type EnquiryTopic =
  'general' | 'price-request' | 'condition' | 'shipping-quote' | 'framing' | 'export'

export type EnquiryRequest = {
  readonly topic: EnquiryTopic
  readonly productId: ProductPublicId | null
  readonly message: string
  readonly contact: LeadContactInput
  readonly attachments: readonly UploadId[]
  readonly idempotencyKey: IdempotencyKey
}

export type EnquiryReceipt = {
  readonly enquiryToken: string
  /** The brand's stated reply window ("replies 09–21 WITA"); null outside it, with the next opening. */
  readonly replyWithinHours: number | null
}

/** "Sell to us" (module `services.consignment`): the item, its titles and its verso, photographed. */
export type ConsignmentPhoto = {
  readonly uploadId: UploadId
  readonly role: 'item' | 'title' | 'verso' | 'detail'
}

export type ConsignmentRequest = {
  readonly description: string
  readonly photos: readonly ConsignmentPhoto[]
  readonly conditionNotes: string | null
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/** CONTENT-MODEL.md §4 `consignments.status` — the timeline the account shows. */
export type ConsignmentStatus = 'received' | 'reviewing' | 'offer-made' | 'accepted' | 'declined'

export type ConsignmentReceipt = {
  readonly consignmentToken: string
  readonly status: ConsignmentStatus
}

/**
 * Book a viewing (module `services.appointments`). Slots carry their time zone explicitly —
 * Singapore UTC+8, Jakarta WIB UTC+7, Bali WITA UTC+8 — as an IANA zone name.
 */
export type AppointmentSlotsRequest = {
  readonly locationId: string
  readonly from: IsoDate
  readonly to: IsoDate
}

export type AppointmentSlotsView = {
  readonly timeZone: string
  readonly slots: readonly { readonly start: IsoInstant; readonly end: IsoInstant }[]
}

export type AppointmentPurpose = 'viewing' | 'consultation'

export type AppointmentBookRequest = {
  readonly locationId: string
  readonly slotStart: IsoInstant
  readonly purpose: AppointmentPurpose
  /**
   * The viewing pull list: pieces from the wishlist, brought out of the drawer in advance — at
   * launch the wishlist kept on the booker's device (D35, D54), whose ids the booking form posts.
   */
  readonly pullList: readonly ProductPublicId[]
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/**
 * How a caller proves an appointment is theirs, as `OfferAccess` does: the account's session and
 * the appointment's id — its `ref` (./storage.ts), which opens nothing without that session — so
 * a signed-in page holds no token (C2 `AccountViewingVM`); or the token its confirmation carries
 * (email, WhatsApp; `./links`, purpose `appointment`), for a booker who is not signed in.
 * `account` exists only where a brand signs buyers in — none at launch: the gallery has no
 * accounts (D54), so its viewings are changed through their confirmation's link, or by staff
 * after a WhatsApp message; a handler refuses `account` where `accounts.buyers` is off.
 */
export type AppointmentAccess =
  | { readonly kind: 'account'; readonly appointmentId: string }
  | { readonly kind: 'token'; readonly token: string }

/** Reschedule or cancel. */
export type AppointmentChangeRequest = {
  readonly access: AppointmentAccess
  readonly change:
    | { readonly action: 'reschedule'; readonly slotStart: IsoInstant }
    | { readonly action: 'cancel' }
}

export type AppointmentView = {
  readonly appointmentToken: string
  readonly status: 'requested' | 'confirmed' | 'cancelled' | 'completed'
  readonly locationId: string
  readonly slotStart: IsoInstant
  readonly timeZone: string
  /**
   * The `.ics` for a signed-in booker: C13's `appointments` `ics`, read by the session, its URL
   * naming the appointment and never a token. `null` for a guest — every gallery booker, since it
   * signs no one in (D54) — whose confirmation email attaches its `.ics` instead: no calendar URL
   * ever carries a token.
   */
  readonly icsUrl: string | null
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// D36: one programme for every business buyer — no enquiry topic stands in for it.
type _NoBusinessTopic = Assert<
  Equals<Extract<EnquiryTopic, 'wholesale' | 'trade' | 'business'>, never>
>

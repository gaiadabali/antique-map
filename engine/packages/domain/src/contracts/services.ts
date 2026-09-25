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

/** CONTENT-MODEL.md §4 `enquiries.topic`. */
export type EnquiryTopic =
  'general' | 'price-request' | 'condition' | 'shipping-quote' | 'framing' | 'export' | 'wholesale'

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
  /** The viewing pull list: pieces from the wishlist, brought out of the drawer in advance. */
  readonly pullList: readonly ProductPublicId[]
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

/** Reschedule or cancel, by the opaque token in the confirmation (email, WhatsApp, account). */
export type AppointmentChangeRequest = {
  readonly appointmentToken: string
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
  /** The `.ics` the confirmation carries. */
  readonly icsUrl: string
}

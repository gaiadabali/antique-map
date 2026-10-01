/**
 * @contract C2 — view models: the account's conversations · owner: ARC · consumers: WEB, UXG
 *
 * The gallery's requests, answered in one place (EXPERIENCE-GALLERY.md §10): my offers with
 * the counter's true countdown (`purchase.offers`), holds (`purchase.holds`), price requests
 * (`purchase.requestPrice`), viewings to reschedule, cancel or add to a calendar
 * (`services.appointments`) and consignments with their status timeline
 * (`services.consignment`). Statuses are C6/C8's own; the buyer's answers go through C6 by the
 * account's session and each record's id, never with a price the page showed — and never with a
 * token: the page holds none, in an intent or a URL, but a payment link's own address (`payHref`,
 * C13); the emailed links carry theirs. v1.5 (D50, D54): no brand renders this at launch — the
 * gallery has no offers or holds to list and no accounts at all, so each of its conversations
 * comes back by its own email or WhatsApp; it stays for a brand that signs buyers in.
 */
import type {
  AppointmentAccess,
  AppointmentPurpose,
  ConsignmentStatus,
  OfferAccess,
} from '@engine/domain/api'
import type { OfferStatus } from '@engine/domain/machines/offer'

import type { ImageVM, IsoDateTime, MessageVM, Money, PriceVM } from '../common'
import type { ItemRefVM } from '../commerce'
import type { LocationSummaryVM } from './editorial'

export type AccountOfferVM = {
  item: ItemRefVM
  status: OfferStatus
  proposal: Money
  counter: Money | null
  /** A counter's window (72 h by default): the countdown is true, so it is shown. */
  expiresAt: IsoDateTime | null
  /** Accepted: the private payment link, which expires before the offer hold does. */
  payHref: string | null
  /**
   * Submitted or countered: `offer.respond` — accept, revise or withdraw — by the session and the
   * offer's id. The component adds the answer and an idempotency key.
   */
  respond: { access: Extract<OfferAccess, { kind: 'account' }> } | null
}

export type AccountHoldVM = {
  item: ItemRefVM
  status: 'requested' | 'granted' | 'declined' | 'expired'
  requestedAt: IsoDateTime
  /** "On hold for you until Friday 14:00". */
  heldUntil: IsoDateTime | null
  payHref: string | null
}

export type AccountPriceRequestVM = {
  item: ItemRefVM
  askedAt: IsoDateTime
  /**
   * Revealed in the buyer's market, so the rupiah rule holds here too; or with a person, who
   * replies within the brand's promise (`reply`, a `message.<code>` as `UniqueBaseVM.reply`, G9) —
   * always so where the brand's unique prices are on request (D50, v1.5).
   */
  answer: { kind: 'revealed'; price: PriceVM } | { kind: 'queued'; reply: MessageVM | null }
}

export type AccountViewingVM = {
  location: LocationSummaryVM
  slotStart: IsoDateTime
  /** Slots always say their zone: Singapore UTC+8, Jakarta WIB UTC+7, Bali WITA UTC+8. */
  timeZone: string
  purpose: AppointmentPurpose
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed'
  /** The pieces brought out of the drawer in advance, from the wishlist. */
  pullList: readonly ItemRefVM[]
  /** The `appointment` form for this viewing (C10 `form` with `appointment`), read by session. */
  reschedule: { href: string } | null
  /** `appointment.change` with `{ action: 'cancel' }`, by the session and the viewing's id. */
  cancel: { access: Extract<AppointmentAccess, { kind: 'account' }> } | null
  /** Its `.ics`, served by session (C6 `AppointmentView.icsUrl`): the URL names it, no token. */
  ics: string | null
}

export type AccountConsignmentVM = {
  description: string
  submittedAt: IsoDateTime
  status: ConsignmentStatus
  /** Every step in order, reached or not — the "what happens next" timeline. */
  timeline: readonly { status: ConsignmentStatus; at: IsoDateTime | null }[]
  photos: readonly ImageVM[]
}

export type ConversationSectionVM =
  | { section: 'offers'; offers: readonly AccountOfferVM[] }
  | { section: 'holds'; holds: readonly AccountHoldVM[] }
  | { section: 'priceRequests'; requests: readonly AccountPriceRequestVM[] }
  | { section: 'viewings'; viewings: readonly AccountViewingVM[]; book: { href: string } }
  | {
      section: 'consignments'
      consignments: readonly AccountConsignmentVM[]
      submit: { href: string }
    }

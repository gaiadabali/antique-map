/**
 * @contract C2 — view models: the account's conversations · owner: ARC · consumers: WEB, UXG
 *
 * The gallery's requests, answered in one place (EXPERIENCE-GALLERY.md §10): my offers with
 * the counter's true countdown (`purchase.offers`), holds (`purchase.holds`), price requests
 * (`purchase.requestPrice`), viewings to reschedule, cancel or add to a calendar
 * (`services.appointments`) and consignments with their status timeline
 * (`services.consignment`). Statuses are C6/C8's own; the buyer's answers go through C6
 * with the opaque token each conversation carries, never with a price the page showed.
 */
import type { AppointmentPurpose, ConsignmentStatus } from '@engine/domain/api'
import type { OfferStatus } from '@engine/domain/machines/offer'

import type { ImageVM, IsoDateTime, Money, PriceVM } from '../common'
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
  /** Submitted or countered: `offer.respond` — accept, revise or withdraw. */
  respond: { offerToken: string } | null
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
  /** Revealed in the buyer's market, so the rupiah rule holds here too; or queued for a person. */
  answer: { kind: 'revealed'; price: PriceVM } | { kind: 'queued'; replyWithinHours: number }
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
  reschedule: { href: string } | null
  /** `appointment.change` with `{ action: 'cancel' }`. */
  cancel: { appointmentToken: string } | null
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

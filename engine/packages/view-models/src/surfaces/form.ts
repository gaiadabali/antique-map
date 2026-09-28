/**
 * @contract C2 — view models: forms · owner: ARC · consumers: WEB, UXG, UXE
 *
 * One engine for enquiry · offer · consignment · appointment · wholesale (C10 `FORM_KINDS`,
 * DESIGN-SYSTEM.md §2): the fields are data the loader builds from the kind, the brand's
 * modules and the item, so an app renders a list rather than hard-coding a form. A field's
 * `name` is its dotted path in the C6 request (`contact.whatsapp`, `message`) and the key its
 * label and hint are looked up by. The form posts to its C13 route with JavaScript or
 * without; what is sent is stored and put on the staff desk, and the page says when a person
 * will reply (EXPERIENCE-GALLERY.md §9). Errors explain and instruct and never clear what was
 * typed. The offer's bid is the one amount a client ever sends (C6), and it is not a price.
 */
import type { FormKind } from '@engine/config/routes'
import type { CurrencyCode } from '@engine/config/schema'
import type {
  AppointmentSlotsView,
  ConsignmentPhoto,
  EnquiryTopic,
  FieldError,
} from '@engine/domain/api'

import type { BlockVM } from '../blocks'
import type { MessageVM, PriceVM, SeoVM, Streamed } from '../common'
import type { ItemRefVM } from '../commerce'

export type FormFieldVM = {
  name: string
  input:
    | 'text'
    | 'email'
    | 'tel'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'money'
    | 'file'
  required: boolean
  /** The HTML `autocomplete` token (`name`, `email`, `tel`). */
  autocomplete: string | null
  options: readonly { value: string; label: string }[]
  maxLength: number | null
}

export type FormVM = {
  surface: 'form'
  kind: FormKind
  title: string
  intro: readonly BlockVM[]
  /** The item the form is about ("Enquire about M.0001"), with its price where it shows one. */
  subject: (ItemRefVM & { price: PriceVM | null }) | null
  /** An enquiry's topic, preselected from the link (`?topic=framing`), and those offered. */
  topic: { selected: EnquiryTopic; offered: readonly EnquiryTopic[] } | null
  fields: readonly FormFieldVM[]
  /** Separate and unticked by default, one per purpose. */
  consents: readonly ('marketingEmail' | 'marketingWhatsapp')[]
  /** The C13 route the form posts to. */
  action: string
  /** "A specialist will reply within 24 hours" · "replies 09–21 WITA". */
  reply: MessageVM | null
  /** Consignment's "what happens next", before and after sending. */
  nextSteps: readonly MessageVM[]
  /** The bid's currency is the ship-to market's; offers are non-binding (D22); the floor never ships. */
  offer: { currency: CurrencyCode; asking: PriceVM | null; binding: false } | null
  /** Each location with its time zone; slots stream; the wishlist becomes the pull list. */
  appointment: {
    locations: readonly { id: string; name: string; timeZone: string }[]
    slots: Streamed<AppointmentSlotsView> | null
    pullList: readonly ItemRefVM[]
  } | null
  /** The phone camera directly, HEIC accepted, per-file progress, retried on weak networks. */
  uploads: {
    accept: readonly string[]
    maxFiles: number
    maxMegabytes: number
    roles: readonly ConsignmentPhoto['role'][]
  } | null
  /** After a post: received, or every failing field at once with the entries kept. */
  result:
    | { kind: 'received'; reply: MessageVM | null }
    | { kind: 'invalid'; fields: readonly FieldError[]; values: Readonly<Record<string, string>> }
    | null
  seo: SeoVM
}

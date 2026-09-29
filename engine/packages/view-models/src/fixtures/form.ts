/**
 * @contract C2 — fixtures `form` (enquiry, offer, consignment, appointment, reschedule, hold, quote, invalid, refused) · owner: ARC
 *
 * One engine, four kinds: fields are data named by their C6 request paths. The offer states
 * that it is non-binding and bids in the ship-to market's currency; the consignment takes
 * photos straight from the phone; the viewing shows each location's time zone and the pull
 * list; an invalid post — sent without JavaScript and read back (C13 `FORM_RESULT`) — keeps
 * every entry and names every failing field at once.
 */
import type { FormVM } from '../surfaces/form'
import { ISLE, PRINT, SHOWROOM } from './_commerce'
import { contactFields, entry, hidden, optional } from './_forms'
import { money, price, seo } from './_shared'

const contact = (returnTo: string) => [
  ...contactFields().map((each) => (each.input === 'hidden' ? each : { ...each, required: false })),
  hidden('returnTo', returnTo),
]

export const formEnquiry: FormVM = {
  surface: 'form',
  kind: 'enquiry',
  title: 'Ask about this map',
  intro: [],
  subject: { ...ISLE, price: price(money(480000, 'USD')) },
  topic: {
    selected: 'framing',
    offered: ['general', 'condition', 'shipping-quote', 'framing', 'export'],
  },
  fields: [...contact('/enquire'), entry('message', 'textarea')],
  consents: ['marketingEmail', 'marketingWhatsapp'],
  action: '/api/x/commerce/enquiries',
  reply: { code: 'replyWithinHours', params: { hours: 24 } },
  nextSteps: [],
  offer: null,
  appointment: null,
  uploads: null,
  result: null,
  seo: { ...seo('Enquire', '/enquire'), noindex: true },
}

export const formOffer: FormVM = {
  ...formEnquiry,
  kind: 'offer',
  title: 'Make an offer',
  topic: null,
  fields: [
    ...contact('/make-an-offer'),
    entry('proposal', 'money', { inputMode: 'decimal' }),
    optional('message', 'textarea'),
  ],
  action: '/api/x/commerce/offers',
  offer: { currency: 'USD', asking: price(money(480000, 'USD')), binding: false },
  seo: { ...seo('Make an offer', '/make-an-offer'), noindex: true },
}

export const formConsignment: FormVM = {
  ...formEnquiry,
  kind: 'consignment',
  title: 'Sell to us',
  subject: null,
  topic: null,
  fields: [
    ...contact('/sell-to-us'),
    entry('description', 'textarea'),
    optional('conditionNotes', 'textarea'),
    entry('photos', 'file'),
  ],
  action: '/api/x/commerce/consignments',
  reply: { code: 'replyWithinDays', params: { days: 3 } },
  nextSteps: [{ code: 'consignReceived' }, { code: 'consignReviewed' }, { code: 'consignOffer' }],
  uploads: {
    accept: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
    maxFiles: 12,
    maxMegabytes: 20,
    roles: ['item', 'title', 'verso', 'detail'],
  },
  seo: { ...seo('Sell to us', '/sell-to-us'), noindex: false },
}

const viewing = {
  locations: [{ id: 'showroom', name: SHOWROOM.name, timeZone: 'Asia/Makassar' }],
  // Resolved with the page, never streamed: they are the form's own choices.
  slots: {
    timeZone: 'Asia/Makassar',
    slots: [
      { start: '2026-10-03T03:00:00.000Z', end: '2026-10-03T04:00:00.000Z' },
      { start: '2026-10-03T06:00:00.000Z', end: '2026-10-03T07:00:00.000Z' },
    ],
  },
  pullList: [ISLE],
} satisfies FormVM['appointment']

export const formAppointment: FormVM = {
  ...formEnquiry,
  kind: 'appointment',
  title: 'Book a viewing',
  topic: null,
  fields: [...contact('/book-a-visit'), entry('locationId', 'radio'), entry('slotStart', 'radio')],
  action: '/api/x/commerce/appointments',
  reply: null,
  appointment: viewing,
  seo: { ...seo('Book a viewing', '/book-a-visit'), noindex: false },
}

/**
 * A signed-in booker's own viewing, rescheduled (C10 `form` with `appointment`): the form posts
 * `appointment.change` by the session and the viewing's id — no token in the page or its URL.
 */
export const formReschedule: FormVM = {
  ...formAppointment,
  title: 'Move your viewing',
  fields: [
    hidden('access.kind', 'account'),
    hidden('access.appointmentId', '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a'),
    hidden('change.action', 'reschedule'),
    entry('change.slotStart', 'radio'),
    hidden('returnTo', '/book-a-visit?appointment=0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a'),
  ],
  action: '/api/x/commerce/appointments/change',
  consents: [],
  appointment: { ...viewing, pullList: [] },
  seo: { ...seo('Move your viewing', '/book-a-visit'), noindex: true },
}

export const formInvalid: FormVM = {
  ...formEnquiry,
  result: {
    kind: 'invalid',
    fields: [
      { path: 'contact.email', reason: 'format' },
      { path: 'message', reason: 'required' },
    ],
    values: { 'contact.fullName': 'Anna Voorbeeld', 'contact.email': 'anna@example' },
  },
}

/** "Reserve": a staff hold on this item (C6 `hold.request`) — the panel's own page for it. */
export const formHold: FormVM = {
  ...formEnquiry,
  kind: 'hold',
  title: 'Ask us to hold it',
  topic: null,
  fields: [
    ...contact('/hold?item=1001'),
    hidden('productId', '1001'),
    optional('message', 'textarea'),
  ],
  action: '/api/x/commerce/holds',
  reply: { code: 'holdReplyWithinHours', params: { hours: 24 } },
  seo: { ...seo('Ask us to hold it', '/hold'), noindex: true },
}

/** Sent without JavaScript while someone else took it: refused, said plainly, entries kept. */
export const formRefused: FormVM = {
  ...formHold,
  result: {
    kind: 'refused',
    code: 'reservation-conflict',
    message: { code: 'heldByAnotherMeanwhile' },
  },
}

const institution = [
  entry('institution.organisation', 'text', { group: 'institution', autocomplete: 'organization' }),
  optional('institution.taxId', 'text', { group: 'institution' }),
  optional('institution.poNumber', 'text', { group: 'institution' }),
]

/**
 * A quote for this item (C6 `quote.request`, one line), from a guest institution where
 * `accounts.retailers` is off — the panel's "Proforma for institutions": staff issue it.
 */
export const formQuote: FormVM = {
  ...formEnquiry,
  kind: 'quote',
  title: 'Ask for a quote or a proforma',
  subject: { ...ISLE, price: null },
  topic: null,
  fields: [
    hidden('lines.0.productId', '1001'),
    hidden('lines.0.quantity', '1'),
    ...institution,
    ...contact('/request-a-quote?item=1001'),
    optional('message', 'textarea'),
    optional('neededBy', 'date'),
  ],
  action: '/api/x/commerce/quotes',
  reply: { code: 'quoteReplyWithinDays', params: { days: 2 } },
  seo: { ...seo('Ask for a quote', '/request-a-quote'), noindex: true },
}

/**
 * "Turn this into a quote" for a signed-in partner where `accounts.retailers` is on (D36): its
 * session is the contact and its record the business, so the form asks only how many and when.
 */
export const formQuotePartner: FormVM = {
  ...formQuote,
  subject: { ...PRINT, price: null },
  fields: [
    hidden('lines.0.productId', '7001'),
    hidden('lines.0.variantId', '70011'),
    entry('lines.0.quantity', 'text', { inputMode: 'numeric', value: '40' }),
    optional('message', 'textarea'),
    optional('neededBy', 'date'),
    hidden('returnTo', '/request-a-quote?item=7001&variant=70011'),
  ],
  consents: [],
  reply: { code: 'quoteReplyWithinDays', params: { days: 2 } },
}

/**
 * @contract C2 — fixtures `form` (enquiry, offer, consignment, appointment, wholesale, invalid) · owner: ARC
 *
 * One engine, five kinds: fields are data named by their C6 request paths. The offer states
 * that it is non-binding and bids in the ship-to market's currency; the consignment takes
 * photos straight from the phone; the viewing shows each location's time zone and the pull
 * list; an invalid post keeps every entry and names every failing field at once.
 */
import type { FormFieldVM, FormVM } from '../surfaces/form'
import { ISLE, SHOWROOM } from './_commerce'
import { money, price, seo, streamed } from './_shared'

const AUTOCOMPLETE: Readonly<Record<string, string>> = {
  'contact.fullName': 'name',
  'contact.email': 'email',
  'contact.whatsapp': 'tel',
}
const field = (name: string, input: FormFieldVM['input'], required = true): FormFieldVM => ({
  name,
  input,
  required,
  autocomplete: AUTOCOMPLETE[name] ?? null,
  options: [],
  maxLength: input === 'textarea' ? 2000 : null,
})
const contact = [
  field('contact.fullName', 'text', false),
  field('contact.email', 'email', false),
  field('contact.whatsapp', 'tel', false),
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
  fields: [...contact, field('message', 'textarea')],
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
  fields: [...contact, field('proposal', 'money'), field('message', 'textarea', false)],
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
    ...contact,
    field('description', 'textarea'),
    field('conditionNotes', 'textarea', false),
    field('photos', 'file'),
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

export const formAppointment: FormVM = {
  ...formEnquiry,
  kind: 'appointment',
  title: 'Book a viewing',
  topic: null,
  fields: [...contact, field('locationId', 'radio'), field('slotStart', 'radio')],
  action: '/api/x/commerce/appointments',
  reply: null,
  appointment: {
    locations: [{ id: 'showroom', name: SHOWROOM.name, timeZone: 'Asia/Makassar' }],
    slots: streamed({
      timeZone: 'Asia/Makassar',
      slots: [
        { start: '2026-10-03T03:00:00.000Z', end: '2026-10-03T04:00:00.000Z' },
        { start: '2026-10-03T06:00:00.000Z', end: '2026-10-03T07:00:00.000Z' },
      ],
    }),
    pullList: [ISLE],
  },
  seo: { ...seo('Book a viewing', '/book-a-visit'), noindex: false },
}

export const formWholesale: FormVM = {
  ...formEnquiry,
  kind: 'wholesale',
  title: 'For business',
  subject: null,
  topic: { selected: 'wholesale', offered: ['wholesale'] },
  fields: [...contact, field('institution.organisation', 'text'), field('message', 'textarea')],
  seo: { ...seo('For business', '/trade'), noindex: false },
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

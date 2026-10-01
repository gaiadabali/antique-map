/**
 * @contract C2 — fixture `item-enquiry-only` · owner: ARC
 * No recorded stock location or export status (every migrated original until the owner's
 * item register is loaded): routable to no destination, so it publishes enquiry-only —
 * its URL, essay and images stay live. Nothing is ever defaulted into exportability.
 */
import type { ItemVM } from '../surfaces/item'
import { enquire, originalItem, reply, whatsapp } from './_item'

export const itemEnquiryOnly: ItemVM = originalItem({
  kind: 'enquiryOnly',
  reason: 'unroutable',
  price: null,
  actions: {
    primary: enquire,
    secondary: [whatsapp, { action: 'viewing', href: '/book-a-visit?item=1001' }],
  },
  reply,
  analytics: { priceBand: 'none', status: 'available' },
})

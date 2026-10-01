/**
 * @contract C2 — fixture `item-availability-unverified` · owner: ARC
 * The availability read failed: the streamed panel resolves to an enquiry — it never rejects
 * into an error boundary, and never shows a purchase control it could not check.
 */
import type { ItemVM } from '../surfaces/item'
import { enquire, originalItem, reply, whatsapp } from './_item'

export const itemAvailabilityUnverified: ItemVM = originalItem({
  kind: 'enquiryOnly',
  reason: 'unverified',
  price: null,
  actions: { primary: enquire, secondary: [whatsapp] },
  reply,
  analytics: { priceBand: 'none', status: null },
})

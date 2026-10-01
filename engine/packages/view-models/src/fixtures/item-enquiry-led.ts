/**
 * @contract C2 — fixture `item-enquiry-led` · owner: ARC
 *
 * The gallery's item page at launch (D50, v1.5): an original with no price — "Price on
 * request" — whose panel leads with the conversation (WhatsApp, a call, a price request a person
 * answers, an enquiry, a viewing, a proforma), the reply promise beside it (G9); and the same
 * piece on hold until the due date of an invoice someone else holds (D45).
 */
import type { ItemVM } from '../surfaces/item'
import { originalItem } from './_item'
import { purchaseStates } from './purchase-states'

export const itemEnquiryLed: ItemVM = originalItem(purchaseStates.conversation)

export const itemInvoiceHeld: ItemVM = originalItem(purchaseStates.invoiceHeldByOther)

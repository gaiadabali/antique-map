/**
 * @contract C2 — fixture `item-unique` · owner: ARC
 * An available original, priced, deliverable to the visitor's destination: Buy leads.
 */
import type { ItemVM } from '../surfaces/item'
import { enquire, originalItem, uniqueBase, whatsapp } from './_item'
import { line, money, price } from './_shared'

export const itemUnique: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'fixed', price: price(money(480000, 'USD')) },
  state: { kind: 'available' },
  actions: { primary: { action: 'buy', line: line(1001) }, secondary: [enquire, whatsapp] },
  insuredShipping: { kind: 'estimate', price: price(money(9500, 'USD')) },
})

/** The same item before availability resolves: the panel reserves its height, no controls. */
export const itemUniqueStreaming: ItemVM = originalItem('pending')

/**
 * @contract C2 — fixture `item-on-hold` · owner: ARC
 * Held by someone else until a stated time; the want-list alert is offered.
 */
import type { ItemVM } from '../surfaces/item'
import { enquire, originalItem, uniqueBase } from './_item'
import { money, price } from './_shared'

export const itemOnHold: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'fixed', price: price(money(480000, 'USD')) },
  state: { kind: 'heldByOther', until: '2026-09-26T14:00:00+08:00' },
  actions: { primary: null, secondary: [enquire] },
})

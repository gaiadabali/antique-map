/**
 * @contract C2 — fixture `item-price-on-request` · owner: ARC
 * The top tier: Request price leads (answered in place), with viewing and proforma.
 */
import type { ItemVM } from '../surfaces/item'
import { originalItem, uniqueBase, whatsapp } from './_item'
import { money, price } from './_shared'

export const itemPriceOnRequest: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'onRequest' },
  state: { kind: 'available' },
  actions: {
    primary: { action: 'requestPrice', href: '/enquire?item=1001&topic=price-request' },
    secondary: [
      { action: 'viewing', href: '/book-a-visit?item=1001' },
      { action: 'proforma', href: '/request-a-quote?item=1001' },
      whatsapp,
    ],
  },
  insuredShipping: { kind: 'quote' },
  analytics: { priceBand: 'on-request', status: 'available' },
})

/** After the visitor left an email: the price appears on the page and the lead is logged. */
export const itemPriceRevealed: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'revealed', price: price(money(3850000, 'USD')) },
  state: { kind: 'available' },
  actions: {
    primary: { action: 'viewing', href: '/book-a-visit?item=1001' },
    secondary: [{ action: 'proforma', href: '/request-a-quote?item=1001' }, whatsapp],
  },
  insuredShipping: { kind: 'quote' },
  analytics: { priceBand: 'on-request', status: 'available' },
})

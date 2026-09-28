/**
 * @contract C2 — fixture `purchase-states` · owner: ARC
 *
 * The purchase panel's state matrix (DESIGN-SYSTEM.md §3, TASKS.md 34.1.a): the item's
 * status × the viewer's relation × export status × ship-to. The style guide's state
 * switcher renders each; every one is a designed state, never a disabled Buy button.
 */
import type { PurchaseVM } from '../surfaces/purchase'
import { enquire, uniqueBase, whatsapp } from './_item'
import { card, line, money, price } from './_shared'

const fixed = { kind: 'fixed', price: price(money(480000, 'USD')) } as const
const buy = { action: 'buy', line: line(1001) } as const
const offer = { action: 'offer', href: '/make-an-offer?item=1001' } as const
const reserve = { action: 'reserve', href: '/enquire?item=1001&topic=hold' } as const

export const purchaseStates = {
  available: {
    ...uniqueBase,
    price: fixed,
    state: { kind: 'available' },
    actions: { primary: buy, secondary: [reserve, offer, enquire] },
  },
  heldByOther: {
    ...uniqueBase,
    price: fixed,
    state: { kind: 'heldByOther', until: '2026-09-26T14:00:00+08:00' },
    actions: { primary: null, secondary: [enquire] },
  },
  /** Held for this viewer: Pay leads — never Buy beside their own hold. */
  heldForMe: {
    ...uniqueBase,
    price: fixed,
    state: { kind: 'heldForMe', reason: 'hold', until: '2026-09-27T09:00:00+08:00' },
    actions: { primary: { action: 'pay', href: '/pay/tok_hold_fixture' }, secondary: [whatsapp] },
  },
  /** Already in this viewer's bag: the panel says so and links to it. */
  inMyBag: {
    ...uniqueBase,
    price: fixed,
    state: { kind: 'inMyBag', cartHref: '/bag' },
    actions: { primary: null, secondary: [enquire] },
  },
  inMyCheckout: {
    ...uniqueBase,
    price: fixed,
    state: {
      kind: 'inMyCheckout',
      until: '2026-09-25T10:15:00+08:00',
      checkoutHref: '/checkout',
    },
    actions: { primary: null, secondary: [] },
  },
  myOfferSubmitted: {
    ...uniqueBase,
    price: fixed,
    state: {
      kind: 'myOffer',
      status: 'submitted',
      amount: money(420000, 'USD'),
      counter: null,
      counterExpiresAt: null,
      href: '/account/offers',
    },
    actions: { primary: null, secondary: [enquire] },
  },
  myOfferCountered: {
    ...uniqueBase,
    price: fixed,
    state: {
      kind: 'myOffer',
      status: 'countered',
      amount: money(420000, 'USD'),
      counter: money(450000, 'USD'),
      counterExpiresAt: '2026-09-28T10:00:00+08:00',
      href: '/account/offers',
    },
    actions: { primary: null, secondary: [enquire] },
  },
  sold: {
    ...uniqueBase,
    price: { kind: 'hidden' },
    state: {
      kind: 'sold',
      priceRealised: null,
      alternative: card(1003, 'Another example'),
      print: null,
    },
    actions: { primary: null, secondary: [] },
  },
  /** A Jakarta item, not export-cleared, seen with a Singapore ship-to. */
  domesticOnlyFromAbroad: {
    ...uniqueBase,
    price: { kind: 'fixed', price: price(money(620000, 'SGD')) },
    state: { kind: 'available' },
    delivery: { kind: 'domesticOnly', country: 'ID', viewAt: 'Jakarta' },
    shipsFrom: 'Jakarta',
    actions: {
      primary: { action: 'viewing', href: '/book-a-visit?item=1001' },
      secondary: [{ action: 'enquire', href: '/enquire?item=1001&topic=export' }, whatsapp],
    },
  },
  /** The same item with an Indonesian ship-to: IDR alone, no foreign amount beside it. */
  domesticOnlyAtHome: {
    ...uniqueBase,
    price: { kind: 'fixed', price: price(money(78000000, 'IDR')) },
    state: { kind: 'available' },
    shipsFrom: 'Jakarta',
    actions: { primary: buy, secondary: [enquire, whatsapp] },
  },
  exportPending: {
    ...uniqueBase,
    price: fixed,
    state: { kind: 'available' },
    delivery: { kind: 'exportPending', viewAt: 'Jakarta' },
    shipsFrom: 'Jakarta',
    actions: { primary: enquire, secondary: [whatsapp] },
  },
  editionUnit: {
    ...uniqueBase,
    price: { kind: 'fixed', price: price(money(65000, 'USD')) },
    state: { kind: 'available' },
    edition: { number: 12, of: 100 },
    actions: { primary: { action: 'buy', line: line(1004) }, secondary: [enquire] },
  },
  /** No asking price: the panel invites an offer. */
  offerOnly: {
    ...uniqueBase,
    price: { kind: 'offerOnly' },
    state: { kind: 'available' },
    actions: { primary: offer, secondary: [enquire, whatsapp] },
  },
  /** Queued for a human: the item is marked sensitive. */
  priceQueued: {
    ...uniqueBase,
    price: { kind: 'queued', replyHours: 24 },
    state: { kind: 'available' },
    actions: { primary: null, secondary: [enquire, whatsapp] },
  },
  notForSale: {
    kind: 'enquiryOnly',
    reason: 'notForSale',
    price: null,
    actions: { primary: enquire, secondary: [] },
  },
  /** Availability could not be read just now: an enquiry, never an error or a guess. */
  unverified: {
    kind: 'enquiryOnly',
    reason: 'unverified',
    price: null,
    actions: { primary: enquire, secondary: [whatsapp] },
  },
} satisfies Record<string, PurchaseVM>

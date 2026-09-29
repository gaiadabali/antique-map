/**
 * @contract C2 — fixtures `cart`, `cart-empty`, `cart-problems`, `cart-unique-held` · owner: ARC
 *
 * An emporium bag for an Indonesian ship-to (rupiah alone): a configured giclée, two totes,
 * gift wrap for the whole order, a voucher, the free-shipping bar and two shipments with
 * their own promises. Then the designed edge cases (EXPERIENCE-SHOP.md §7): the bag re-priced
 * into rupiah, glass glazing that cannot go abroad, a showroom item that sold out, a voucher
 * short of its minimum spend — and a gallery bag whose original is in someone else's checkout.
 */
import type { CartLineVM, CartVM } from '../surfaces/cart'
import { ISLE, PRINT, STRAITS, TOTE, totals, WRAP } from './_commerce'
import { card, line, money, price, SELLER_ID, SELLER_SG, seo, streamed } from './_shared'

const idr = (amount: number) => price(money(amount, 'IDR'))
const usd = (amount: number) => price(money(amount, 'USD'))

function cartLine(lineId: string, fields: Omit<CartLineVM, 'lineId' | 'intents'>): CartLineVM {
  return { lineId, ...fields, intents: { update: { lineId }, remove: { lineId } } }
}

const giclee = cartLine('l1', {
  role: { kind: 'product' },
  item: PRINT,
  options: [
    { axis: 'format', value: 'Giclée' },
    { axis: 'size', value: '45 cm' },
    { axis: 'frame', value: 'Natural teak' },
    { axis: 'glazing', value: 'Acrylic' },
  ],
  quantity: 1,
  maxQuantity: null,
  unitPrice: idr(1250000),
  subtotal: money(1250000, 'IDR'),
  delivery: [{ code: 'madeToOrder', params: { min: 3, max: 5 } }],
  problems: [],
  remedy: null,
})

const totes = cartLine('l2', {
  role: { kind: 'product' },
  item: TOTE,
  options: [],
  quantity: 2,
  maxQuantity: 6,
  unitPrice: idr(185000),
  subtotal: money(370000, 'IDR'),
  delivery: [{ code: 'readyAtShowroom', params: { hours: 2 } }],
  problems: [],
  remedy: null,
})

const wrap = cartLine('l3', {
  role: { kind: 'giftWrap', wraps: 'order' },
  item: WRAP,
  options: [],
  quantity: 1,
  maxQuantity: 1,
  unitPrice: idr(45000),
  subtotal: money(45000, 'IDR'),
  delivery: [],
  problems: [],
  remedy: null,
})

const bagTotals = totals({
  currency: 'IDR',
  subtotal: 1665000,
  orderDiscount: 50000,
  taxRegime: 'ID-PPN',
})

export const cart: CartVM = {
  surface: 'cart',
  market: { country: 'ID', currency: 'IDR' },
  lines: [giclee, totes, wrap],
  checkouts: [
    {
      seller: SELLER_ID,
      lineIds: ['l1', 'l2', 'l3'],
      totals: bagTotals,
      shipments: [
        { lineIds: ['l1'], promise: [{ code: 'madeToOrder', params: { min: 3, max: 5 } }] },
        { lineIds: ['l2', 'l3'], promise: [{ code: 'readyAtShowroom', params: { hours: 2 } }] },
      ],
      start: { sellerId: 'id' },
    },
  ],
  codes: [
    { code: 'SELAMAT', kind: 'discount', value: money(50000, 'IDR'), remove: { code: 'SELAMAT' } },
  ],
  codeEntry: { accepts: ['discount', 'gift-card'], error: null },
  giftOptions: {
    note: 'Selamat ulang tahun!',
    hidePrices: true,
    wrap: { line: { ...line(9001), wraps: 'order' }, price: idr(45000) },
  },
  freeShipping: {
    threshold: money(2000000, 'IDR'),
    remaining: money(335000, 'IDR'),
    percent: 83,
  },
  notices: [],
  upsells: streamed([
    card(7010, 'Natural teak frame, 45 cm', {
      status: { kind: 'price', price: idr(650000) },
      isReproduction: false,
      quickAdd: line(7010, 70101),
    }),
  ]),
  empty: null,
  seo: { ...seo('Your bag', '/bag'), noindex: true },
}

export const cartEmpty: CartVM = {
  ...cart,
  lines: [],
  checkouts: [],
  codes: [],
  freeShipping: null,
  upsells: null,
  empty: {
    links: [
      { label: 'Wall art', href: '/wall-art' },
      { label: 'Gifts under Rp 500.000', href: '/gifts/under-500k' },
    ],
    rail: streamed({
      kind: 'newArrivals',
      title: 'New in',
      items: [card(7002, 'Tote')],
      more: null,
    }),
  },
}

/** Ship-to just moved from the Netherlands to Indonesia, with a glass-glazed frame and a sold-out tote. */
export const cartWithProblems: CartVM = {
  ...cart,
  lines: [
    {
      ...giclee,
      options: [...giclee.options.slice(0, 3), { axis: 'glazing', value: 'Glass' }],
      unitPrice: null,
      subtotal: null,
      problems: [{ code: 'option-unavailable-here', lineId: 'l1', alternativeVariantId: 70011 }],
      remedy: {
        kind: 'swap',
        label: 'Acrylic glazing instead',
        line: line(7001, 70011, { glazing: 'acrylic' }),
        price: idr(1250000),
      },
    },
    { ...totes, problems: [{ code: 'insufficient-stock', lineId: 'l2', available: 0 }] },
  ],
  checkouts: [],
  codeEntry: {
    accepts: ['discount', 'gift-card'],
    error: { code: 'code-invalid', reason: 'minimum-spend', shortBy: money(250000, 'IDR') },
  },
  notices: [{ code: 'repriced', from: 'EUR', to: 'IDR' }],
}

/** A gallery bag (US ship-to, USD): one original free to buy, one in someone else's checkout. */
export const cartUniqueHeld: CartVM = {
  surface: 'cart',
  market: { country: 'US', currency: 'USD' },
  lines: [
    cartLine('g1', {
      role: { kind: 'product' },
      item: STRAITS,
      options: [],
      quantity: 1,
      maxQuantity: 1,
      unitPrice: usd(95000),
      subtotal: money(95000, 'USD'),
      delivery: [],
      problems: [],
      remedy: null,
    }),
    cartLine('g2', {
      role: { kind: 'product' },
      item: ISLE,
      options: [],
      quantity: 1,
      maxQuantity: 1,
      unitPrice: null,
      subtotal: null,
      delivery: [],
      problems: [
        { code: 'unavailable', lineId: 'g2', state: 'held', heldUntil: '2026-09-25T02:15:00.000Z' },
      ],
      remedy: { kind: 'wantList', href: '/alerts?like=1001' },
    }),
  ],
  checkouts: [
    {
      seller: SELLER_SG,
      lineIds: ['g1'],
      totals: totals({ currency: 'USD', subtotal: 95000, taxRegime: 'SG-GST' }),
      shipments: [
        { lineIds: ['g1'], promise: [{ code: 'shipsFrom', params: { city: 'Singapore' } }] },
      ],
      start: { sellerId: 'sg' },
    },
  ],
  codes: [],
  codeEntry: null,
  giftOptions: null,
  freeShipping: null,
  notices: [],
  upsells: null,
  empty: null,
  seo: { ...seo('Your bag', '/bag'), noindex: true },
}

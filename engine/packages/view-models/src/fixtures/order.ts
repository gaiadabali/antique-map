/**
 * @contract C2 — fixtures `order` (paid, payment pending by VA and by QRIS, retry, manual) · owner: ARC
 *
 * The confirmation of the export checkout, opened with its order-access cookie, with the
 * conversion its consented tags report; the Indonesian order waiting on a BCA virtual account —
 * amount, VA number, countdown, WhatsApp updates, the poll that turns the page to Paid, scoped by
 * the cookie, never a token in the page; the same order paid by QRIS, which a phone cannot scan
 * from its own screen; a lapsed payment that retries with the bag kept; and a showroom sale
 * settled on WhatsApp, ready to collect with a pickup code.
 */
import type { OrderLineVM, OrderVM } from '../surfaces/order'
import { ISLE, PRINT, SHOWROOM, STRAITS, TOTE, totals, WRAP } from './_commerce'
import { money, SELLER_ID, SELLER_SG, seo } from './_shared'

const orderLine = (lineId: string, fields: Omit<OrderLineVM, 'lineId' | 'returnable'>) =>
  ({ lineId, ...fields, returnable: true }) satisfies OrderLineVM

export const orderPaid: OrderVM = {
  surface: 'order',
  number: 'SG-000123',
  placedAt: '2026-09-25T10:32:00+08:00',
  access: 'lookup',
  context: 'confirmation',
  status: 'paid',
  seller: SELLER_SG,
  lines: [
    orderLine('x1', {
      item: STRAITS,
      options: [],
      quantity: 1,
      unitPrice: money(95000, 'USD'),
      total: money(95000, 'USD'),
    }),
  ],
  totals: totals({
    currency: 'USD',
    subtotal: 95000,
    shipping: 8500,
    taxRegime: 'SG-GST',
    estimate: money(95300, 'EUR'),
  }),
  delivery: {
    kind: 'ship',
    recipient: 'Anna Voorbeeld',
    address: ['Voorbeeldstraat 1', '1000 AA Amsterdam', 'Netherlands'],
    deliverBefore: null,
  },
  shipments: [],
  payment: {
    state: 'paid',
    method: 'card',
    amount: money(103500, 'USD'),
    paidAt: '2026-09-25T10:33:10+08:00',
  },
  documents: [
    { kind: 'confirmation', href: '/api/x/commerce/orders/SG-000123/documents/confirmation' },
    { kind: 'certificate', href: '/api/x/commerce/orders/SG-000123/documents/certificate' },
  ],
  nextSteps: [
    { code: 'packedWithin', params: { days: 2 } },
    { code: 'trackingByEmail' },
    { code: 'dutiesOnDelivery' },
  ],
  updates: 'email',
  returns: { href: '/orders/SG-000123/return' },
  conversion: {
    transactionId: 'SG-000123',
    value: money(103500, 'USD'),
    tax: money(0, 'USD'),
    shipping: money(8500, 'USD'),
    items: [{ productId: 1006, variantId: null, quantity: 1, unitPrice: money(95000, 'USD') }],
  },
  seo: { ...seo('Order SG-000123', '/orders/SG-000123'), noindex: true },
}

const idrLines = [
  orderLine('l1', {
    item: PRINT,
    options: [
      { axis: 'format', value: 'Giclée' },
      { axis: 'size', value: '45 cm' },
      { axis: 'frame', value: 'Natural teak' },
    ],
    quantity: 1,
    unitPrice: money(1250000, 'IDR'),
    total: money(1250000, 'IDR'),
  }),
  orderLine('l2', {
    item: TOTE,
    options: [],
    quantity: 2,
    unitPrice: money(185000, 'IDR'),
    total: money(370000, 'IDR'),
  }),
  orderLine('l3', {
    item: WRAP,
    options: [],
    quantity: 1,
    unitPrice: money(45000, 'IDR'),
    total: money(45000, 'IDR'),
  }),
]

export const orderPendingVa: OrderVM = {
  surface: 'order',
  number: 'ID-000456',
  placedAt: '2026-09-25T10:40:00+08:00',
  access: 'lookup',
  context: 'confirmation',
  status: 'awaiting-payment',
  seller: SELLER_ID,
  lines: idrLines,
  totals: totals({
    currency: 'IDR',
    subtotal: 1665000,
    orderDiscount: 50000,
    shipping: 25000,
    taxRegime: 'ID-PPN',
  }),
  delivery: {
    kind: 'ship',
    recipient: 'Wayan Contoh',
    address: ['Jl. Contoh Raya No. 2', 'Sanur, Denpasar Selatan', 'Bali 80228'],
    deliverBefore: null,
  },
  shipments: [],
  payment: {
    state: 'pending',
    method: 'va-bca',
    amount: money(1640000, 'IDR'),
    session: {
      kind: 'instructions',
      reference: 'ID-000456-1',
      virtualAccount: '8808123456789012',
      bank: null,
      expiresAt: '2026-09-26T02:40:00.000Z',
    },
    expiresAt: '2026-09-26T10:40:00+08:00',
    dailyCapWarning: false,
    poll: {
      attemptId: 'att_fixture_va',
      scope: { kind: 'order', access: { kind: 'lookup-cookie' } },
    },
  },
  documents: [],
  nextSteps: [{ code: 'payWithinCountdown' }, { code: 'whatsappWhenPaid' }],
  updates: 'whatsapp',
  returns: null,
  conversion: null,
  seo: { ...seo('Pesanan ID-000456', '/orders/ID-000456', ['id']), noindex: true },
}

/** QRIS: "save QR to gallery" and an e-wallet deep link, because a phone cannot scan itself. */
export const orderPendingQris: OrderVM = {
  ...orderPendingVa,
  payment: {
    state: 'pending',
    method: 'qris',
    amount: money(1640000, 'IDR'),
    session: {
      kind: 'qr',
      qrString: '00020101021226670016ID.EXAMPLE.WWW0118936000000000000000215FIXTURE0000001',
      deeplink: 'https://wallet.example.test/pay?ref=ID-000456-2',
      expiresAt: '2026-09-25T02:55:00.000Z',
    },
    expiresAt: '2026-09-25T10:55:00+08:00',
    dailyCapWarning: false,
    poll: {
      attemptId: 'att_fixture_qris',
      scope: { kind: 'order', access: { kind: 'lookup-cookie' } },
    },
  },
}

/** The VA expired unpaid: choose another method; the bag is kept. */
export const orderRetry: OrderVM = {
  ...orderPendingVa,
  status: 'not-paid',
  payment: { state: 'retry', method: 'va-bca', reason: 'expired', retryHref: '/checkout' },
  nextSteps: [{ code: 'bagKept' }],
}

/** A showroom sale agreed on WhatsApp: settled off-platform, collected with a code. */
export const orderManual: OrderVM = {
  ...orderPaid,
  number: 'SG-000124',
  access: 'account',
  context: 'detail',
  status: 'ready-for-pickup',
  lines: [
    orderLine('m1', {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(450000, 'USD'),
      total: money(450000, 'USD'),
    }),
  ],
  totals: totals({ currency: 'USD', subtotal: 450000, shipping: 0, taxRegime: 'SG-GST' }),
  delivery: { kind: 'pickup', location: SHOWROOM, code: 'K7Q2', ready: true, collector: null },
  payment: { state: 'manual', note: 'Paid by bank transfer, as agreed on WhatsApp.' },
  nextSteps: [{ code: 'bringPickupCode' }],
  conversion: null,
  seo: { ...seo('Order SG-000124', '/orders/SG-000124'), noindex: true },
}

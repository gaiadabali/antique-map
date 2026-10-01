/**
 * @contract C2 — fixtures `pay-invoice…` and `order-invoice` · owner: ARC
 *
 * The gallery's invoice (D50, v1.5, the developer's gap A): the price agreed on WhatsApp, staff
 * issue it from the order builder and share its link into the chat, and it opens on the
 * gallery's own `/pay/{token}` page — the Payment Element embedded, bank transfer beside it,
 * never a gateway's page. Its designed states: open ("On hold until" its due date, D45), bank
 * transfer pending, paid, expired (the due date passed and the piece released) and voided (staff
 * cancelled it); and the order it placed at issue, awaiting payment, as a signed-in buyer's
 * account shows it.
 */
import type { OrderVM } from '../surfaces/order'
import type { PayVM } from '../surfaces/pay'
import { ISLE, paymentOption, token, totals } from './_commerce'
import { money, SELLER_SG, seo } from './_shared'

const DUE = '2026-10-09T17:00:00+08:00'
const TOKEN = 'tok_invoice_fixture'

export const payInvoice: PayVM = {
  surface: 'pay',
  reason: 'invoice',
  status: 'open',
  seller: SELLER_SG,
  lines: [
    {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(420000, 'USD'),
      total: money(420000, 'USD'),
    },
  ],
  // The agreed figure, and the insured shipping staff quoted onto the invoice (G11).
  totals: totals({ currency: 'USD', subtotal: 420000, shipping: 18000, taxRegime: 'SG-GST' }),
  invoice: {
    number: 'SGPF-000031',
    buyer: { name: 'A. Collector', organisation: null, taxId: null, poNumber: null },
    pdf: '/api/x/commerce/pay/pdf?token=tok_invoice_fixture',
  },
  expiresAt: DUE,
  holdExpiresAt: DUE,
  note: 'As agreed on WhatsApp: the map, insured to Singapore. Import duties are yours on arrival.',
  terms: [
    { label: 'The certificate', href: '/certificate' },
    { label: 'Shipping and insurance', href: '/shipping' },
  ],
  methods: [
    // The Payment Element, embedded in this page: a card captures at once (PAYMENTS.md §1).
    paymentOption('card', 'stripe', 'card', 'embedded', 30),
    paymentOption('bank-transfer', 'bank-transfer', 'bank-transfer', 'instructions', 7 * 24 * 60, {
      confirmation: 'manual',
      refunds: 'manual',
    }),
  ],
  payment: null,
  order: { number: 'SG-000131', href: '/orders/SG-000131' },
  intents: {
    start: { token: TOKEN, acceptedPricing: token('tok_invoice_fixture_pricing') },
    poll: null,
  },
  seo: { ...seo('Invoice SGPF-000031', `/pay/${TOKEN}`), noindex: true },
}

/** Bank transfer chosen: the instructions replayed, the page polling its own link. */
export const payInvoiceTransferPending: PayVM = {
  ...payInvoice,
  payment: {
    attemptId: 'att_fixture_invoice',
    session: {
      kind: 'instructions',
      reference: 'SGPF-000031',
      virtualAccount: null,
      bank: null,
      expiresAt: '2026-10-09T09:00:00.000Z',
    },
    expiresAt: '2026-10-09T09:00:00.000Z',
    lockExpiresAt: '2026-10-09T09:00:00.000Z',
    dailyCapWarning: false,
  },
  intents: {
    start: { token: TOKEN, acceptedPricing: token('tok_invoice_fixture_pricing') },
    poll: { attemptId: 'att_fixture_invoice', scope: { kind: 'pay-link', token: TOKEN } },
  },
}

export const payInvoicePaid: PayVM = { ...payInvoice, status: 'paid', intents: null }

/** Its due date passed unpaid: the piece released (D45), the ways to reach the gallery. */
export const payInvoiceExpired: PayVM = {
  ...payInvoice,
  status: 'expired',
  methods: [],
  intents: null,
}

/** Staff voided it before its due date. */
export const payInvoiceVoided: PayVM = { ...payInvoiceExpired, status: 'cancelled' }

/** The order the invoice placed at issue, awaiting payment, as the buyer's account opens it. */
export const orderInvoice: OrderVM = {
  surface: 'order',
  number: 'SG-000131',
  placedAt: '2026-10-02T11:05:00+08:00',
  access: 'account',
  context: 'detail',
  status: 'awaiting-payment',
  seller: SELLER_SG,
  lines: [
    {
      lineId: 'i1',
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(420000, 'USD'),
      total: money(420000, 'USD'),
      returnable: false,
    },
  ],
  totals: payInvoice.totals,
  delivery: {
    kind: 'ship',
    recipient: 'A. Collector',
    address: ['1 Contoh Road', 'Singapore 000001'],
    deliverBefore: null,
  },
  shipments: [],
  payment: { state: 'invoice', payHref: `/pay/${TOKEN}`, dueAt: DUE },
  documents: [],
  nextSteps: [{ code: 'paymentBeforeCompletion' }, { code: 'dutiesOnDelivery' }],
  updates: 'email',
  returns: null,
  conversion: null,
  seo: { ...seo('Order SG-000131', '/orders/SG-000131'), noindex: true },
}

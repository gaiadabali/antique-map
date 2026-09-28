/**
 * @contract C2 — fixtures `pay` and `quote` · owner: ARC
 *
 * An accepted offer's payment link (the offer hold ends on Sunday; the methods routing
 * allows for a unique item — no cash at a counter); the same link once paid; an
 * institution's proforma for two originals, each held until the due date, with its PDF and
 * PO number; and a business quote staff are still preparing.
 */
import type { PayVM, QuoteVM } from '../surfaces/pay'
import { ISLE, PRINT, STRAITS, token, totals } from './_commerce'
import { money, SELLER_ID, SELLER_SG, seo } from './_shared'

export const pay: PayVM = {
  surface: 'pay',
  reason: 'offer',
  status: 'open',
  seller: SELLER_SG,
  lines: [
    {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(450000, 'USD'),
      total: money(450000, 'USD'),
    },
  ],
  totals: totals({ currency: 'USD', subtotal: 450000, shipping: 12000, taxRegime: 'SG-GST' }),
  expiresAt: '2026-09-27T12:00:00+08:00',
  holdExpiresAt: '2026-09-27T14:00:00+08:00',
  note: 'As agreed, the map is held for you until Sunday.',
  terms: [
    { label: 'Terms of your accepted offer', href: '/offers/terms' },
    { label: 'Returns and the guarantee', href: '/guarantee' },
  ],
  methods: [
    { method: 'card', provider: 'stripe', confirmation: 'automatic', refunds: 'gateway' },
    {
      method: 'bank-transfer',
      provider: 'bank-transfer',
      confirmation: 'manual',
      refunds: 'manual',
    },
  ],
  payment: null,
  order: null,
  intents: {
    start: { token: 'tok_pay_fixture', acceptedPricing: token('tok_pay_fixture_pricing') },
    poll: null,
  },
  seo: { ...seo('Your payment link', '/pay/tok_pay_fixture'), noindex: true },
}

export const payPaid: PayVM = {
  ...pay,
  status: 'paid',
  order: { number: 'SG-000125', href: '/orders/SG-000125' },
  intents: null,
}

/** A bank transfer started from the link: the instructions replayed, the poll on this link. */
export const payTransferPending: PayVM = {
  ...pay,
  payment: {
    attemptId: 'att_fixture_pay',
    session: {
      kind: 'instructions',
      reference: 'SG-000125-1',
      virtualAccount: null,
      bank: {
        bankName: 'Example Bank',
        accountName: 'Fixture Atlas Pte. Ltd.',
        accountNumber: '000-000000-0',
        swift: 'EXAMSGSG',
        iban: null,
      },
      expiresAt: '2026-09-27T04:00:00.000Z',
    },
    expiresAt: '2026-09-27T04:00:00.000Z',
    lockExpiresAt: '2026-09-27T06:00:00.000Z',
  },
  order: { number: 'SG-000125', href: '/orders/SG-000125' },
  intents: {
    start: { token: 'tok_pay_fixture', acceptedPricing: token('tok_pay_fixture_pricing') },
    poll: { attemptId: 'att_fixture_pay', scope: { kind: 'pay-link', token: 'tok_pay_fixture' } },
  },
}

export const quoteProforma: QuoteVM = {
  surface: 'quote',
  kind: 'proforma',
  status: 'issued',
  number: 'SGPF-000012',
  seller: SELLER_SG,
  buyer: {
    name: 'A. Librarian',
    organisation: 'Example University Library',
    taxId: null,
    poNumber: 'PO-4471',
  },
  lines: [
    {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(480000, 'USD'),
      total: money(480000, 'USD'),
      heldUntil: '2026-10-02T17:00:00+08:00',
    },
    {
      item: STRAITS,
      options: [],
      quantity: 1,
      unitPrice: money(95000, 'USD'),
      total: money(95000, 'USD'),
      heldUntil: '2026-10-02T17:00:00+08:00',
    },
  ],
  totals: totals({ currency: 'USD', subtotal: 575000, shipping: 24000, taxRegime: 'SG-GST' }),
  validUntil: '2026-10-02T17:00:00+08:00',
  pdf: '/api/x/commerce/quotes/pdf?token=tok_quote_fixture',
  terms: [{ code: 'paymentBeforeCompletion' }, { code: 'bankDetailsOnPdfOnly' }],
  pay: null,
  intents: {
    accept: { token: 'tok_quote_fixture', acceptedPricing: token('tok_quote_fixture_pricing') },
  },
  seo: { ...seo('Proforma SGPF-000012', '/quote/tok_quote_fixture'), noindex: true },
}

/** For Business: forty framed prints for a hotel at list price; staff are preparing the quote. */
export const quoteRequested: QuoteVM = {
  ...quoteProforma,
  kind: 'quote',
  status: 'requested',
  number: null,
  seller: SELLER_ID,
  buyer: { name: 'Made Contoh', organisation: 'Hotel Contoh', taxId: null, poNumber: null },
  lines: [
    {
      item: PRINT,
      options: [
        { axis: 'size', value: '60 cm' },
        { axis: 'frame', value: 'Dark teak' },
      ],
      quantity: 40,
      unitPrice: money(1850000, 'IDR'),
      total: money(74000000, 'IDR'),
      heldUntil: null,
    },
  ],
  totals: null,
  validUntil: null,
  pdf: null,
  terms: [{ code: 'quoteBeingPrepared', params: { days: 2 } }],
  intents: null,
  seo: { ...seo('Your quote request', '/quote/tok_quote_request'), noindex: true },
}
